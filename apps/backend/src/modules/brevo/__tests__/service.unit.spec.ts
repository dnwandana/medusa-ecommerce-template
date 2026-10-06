import BrevoNotificationProviderService from "../service"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
const options = { apiKey: "test-key", senderEmail: "store@example.com", senderName: "My Store" }
const makeService = () => new BrevoNotificationProviderService({ logger }, options)

const notification = {
  to: "buyer@example.com",
  channel: "email",
  template: "password-reset",
  data: { reset_url: "https://shop.example.com/account/reset-password?token=t" },
}

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }) as any

describe("BrevoNotificationProviderService", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    logger.error.mockReset()
    global.fetch = fetchMock as any
  })

  it("has the identifier brevo", () => {
    expect(BrevoNotificationProviderService.identifier).toBe("brevo")
  })

  it("sends the rendered template to the Brevo API", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { messageId: "<abc@smtp-relay.mailin.fr>" }))

    const result = await makeService().send(notification)

    expect(result).toEqual({ id: "<abc@smtp-relay.mailin.fr>" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({
      "api-key": "test-key",
      "content-type": "application/json",
      accept: "application/json",
    })
    expect(init.signal).toBeDefined()
    const body = JSON.parse(init.body)
    expect(body.sender).toEqual({ name: "My Store", email: "store@example.com" })
    expect(body.to).toEqual([{ email: "buyer@example.com" }])
    expect(body.subject).toBe("Reset your password")
    expect(body.htmlContent).toContain("https://shop.example.com/account/reset-password?token=t")
  })

  it("omits the sender name when the option is absent", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { messageId: "<x>" }))
    const service = new BrevoNotificationProviderService(
      { logger },
      { apiKey: "test-key", senderEmail: "store@example.com" }
    )
    await service.send(notification)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sender).toEqual({
      email: "store@example.com",
    })
  })

  it("logs and throws an error with the template name and the Brevo response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { code: "invalid_parameter", message: "sender is not valid" })
    )
    const message =
      'Brevo did not send the "password-reset" email. Status: 400. Response: invalid_parameter: sender is not valid'

    await expect(makeService().send(notification)).rejects.toThrow(message)
    expect(logger.error).toHaveBeenCalledWith(message)
  })

  it("shows only the message when the Brevo error body has no code", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "Key not found" }))
    await expect(makeService().send(notification)).rejects.toThrow(
      'Brevo did not send the "password-reset" email. Status: 401. Response: Key not found'
    )
  })

  // Review Focus: an error body that is not JSON, and a network failure.
  it("reports an error body that is not JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, "<html>Bad Gateway</html>"))
    await expect(makeService().send(notification)).rejects.toThrow(
      'Brevo did not send the "password-reset" email. Status: 502. Response: <html>Bad Gateway</html>'
    )
  })

  it("reports a network failure with its cause", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))
    const message = 'Brevo did not send the "password-reset" email. Cause: ECONNREFUSED'
    await expect(makeService().send(notification)).rejects.toThrow(message)
    expect(logger.error).toHaveBeenCalledWith(message)
  })

  it("does not call Brevo when the recipient is absent", async () => {
    await expect(makeService().send({ ...notification, to: "" })).rejects.toThrow(
      'The "password-reset" email has no recipient.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("does not call Brevo for an unknown template", async () => {
    await expect(makeService().send({ ...notification, template: "newsletter" })).rejects.toThrow(
      "Unknown email template: newsletter"
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("requires the apiKey and senderEmail options", () => {
    expect(() =>
      BrevoNotificationProviderService.validateOptions({ senderEmail: "a@b.c" })
    ).toThrow("The apiKey option of brevo is required.")
    expect(() => BrevoNotificationProviderService.validateOptions({ apiKey: "k" })).toThrow(
      "The senderEmail option of brevo is required."
    )
    expect(() => BrevoNotificationProviderService.validateOptions(options)).not.toThrow()
  })
})
