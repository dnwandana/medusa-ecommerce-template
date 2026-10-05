import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { calculateShippingAmount, ShippingItem } from "./calculate"

type InjectedDependencies = { logger: Logger }
export type WeightShippingOptions = { ratePerKg: number }

const IDENTIFIER = "weight-shipping"

// Calculates the shipping price from the cart weight. Fulfillment is manual.
class WeightShippingProviderService extends AbstractFulfillmentProviderService {
  static identifier = IDENTIFIER

  protected logger_: Logger
  protected options_: WeightShippingOptions

  constructor({ logger }: InjectedDependencies, options: WeightShippingOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  // Medusa calls this method when it loads the provider. A bad rate stops the start.
  static validateOptions(options: Record<any, any>): void {
    const rate = options?.ratePerKg
    if (!Number.isInteger(rate) || rate <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The ratePerKg option of weight-shipping must be a positive whole number."
      )
    }
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: IDENTIFIER }]
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<any> {
    return data
  }

  async validateOption(_data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  // Do not throw here. An error in this method stops the cart operation.
  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const items = (context?.items ?? []) as ShippingItem[]
    return {
      calculated_amount: calculateShippingAmount(items, this.options_.ratePerKg),
      // The amount stays the final price if the store owner adds tax later.
      is_calculated_price_tax_inclusive: true,
    }
  }

  async createFulfillment(
    _data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    _order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(_data: Record<string, unknown>): Promise<any> {
    return {}
  }

  async createReturnFulfillment(
    _fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default WeightShippingProviderService
