import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowDownMini, ArrowUpMini, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Table,
  Text,
  Toaster,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useEffect, useState } from "react"
import {
  AdminBankAccount,
  BankAccountForm,
  moveAccount,
  validateBankAccountForm,
} from "../../../lib/bank-transfer-form"
import { sdk } from "../../../lib/sdk"

const ACCOUNTS_KEY = ["bank-accounts"]

const EMPTY_FORM: BankAccountForm = { bank_name: "", account_number: "", account_holder: "" }

type FormErrors = Partial<Record<keyof BankAccountForm, string>>

const FIELDS: { name: keyof BankAccountForm; label: string }[] = [
  { name: "bank_name", label: "Bank name" },
  { name: "account_number", label: "Account number" },
  { name: "account_holder", label: "Account holder" },
]

// Sends the changed fields of one bank account.
const updateAccount = (id: string, body: Partial<AdminBankAccount>) =>
  sdk.client.fetch(`/admin/bank-accounts/${id}`, { method: "POST", body })

// Shows the form to add a bank account, or to edit the account that the table selected.
const AccountFormSection = ({
  editing,
  onDone,
}: {
  editing: AdminBankAccount | null
  onDone: () => void
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BankAccountForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setForm(
      editing
        ? {
            bank_name: editing.bank_name,
            account_number: editing.account_number,
            account_holder: editing.account_holder,
          }
        : EMPTY_FORM
    )
    setErrors({})
  }, [editing])

  const save = useMutation({
    mutationFn: (body: BankAccountForm) =>
      editing
        ? updateAccount(editing.id, body)
        : sdk.client.fetch("/admin/bank-accounts", { method: "POST", body }),
    onSuccess: async () => {
      toast.success(editing ? "The bank account is saved." : "The bank account is added.")
      setForm(EMPTY_FORM)
      onDone()
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
    onError: () => toast.error("The bank account was not saved. Try again."),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateBankAccountForm(form)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      save.mutate({
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        account_holder: form.account_holder.trim(),
      })
    }
  }

  return (
    <Container className="px-6 py-4">
      <Heading level="h2">{editing ? "Edit bank account" : "Add bank account"}</Heading>
      <form className="mt-4 flex flex-col gap-y-4" onSubmit={onSubmit} noValidate>
        {FIELDS.map((field) => (
          <div key={field.name} className="flex flex-col gap-y-2">
            <Label htmlFor={`bank-account-${field.name}`}>{field.label}</Label>
            <Input
              id={`bank-account-${field.name}`}
              value={form[field.name]}
              inputMode={field.name === "account_number" ? "numeric" : undefined}
              aria-invalid={Boolean(errors[field.name])}
              onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
            />
            {errors[field.name] && (
              <Text size="small" className="text-ui-fg-error">
                {errors[field.name]}
              </Text>
            )}
          </div>
        ))}
        <div className="flex gap-x-2">
          <Button type="submit" isLoading={save.isPending}>
            {editing ? "Save" : "Add"}
          </Button>
          {editing && (
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Container>
  )
}

// Shows all bank accounts with the controls for the status, the order, edit, and delete.
const AccountsSection = ({ onEdit }: { onEdit: (account: AdminBankAccount) => void }) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const { data, isLoading } = useQuery<{ bank_accounts: AdminBankAccount[] }>({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => sdk.client.fetch("/admin/bank-accounts"),
  })
  const accounts = data?.bank_accounts ?? []

  const reload = () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })

  const setActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAccount(id, { is_active }),
    onSuccess: reload,
    onError: () => toast.error("The status was not changed. Try again."),
  })

  // Saves each changed rank. A failed request leaves the old order of the other accounts.
  const move = useMutation({
    mutationFn: (changes: { id: string; rank: number }[]) =>
      Promise.all(changes.map(({ id, rank }) => updateAccount(id, { rank }))),
    onSettled: reload,
    onError: () => toast.error("The order was not changed. Try again."),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/bank-accounts/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("The bank account is deleted.")
      await reload()
    },
    onError: () => toast.error("The bank account was not deleted. Try again."),
  })

  const onDelete = async (account: AdminBankAccount) => {
    const confirmed = await prompt({
      title: "Delete the bank account?",
      description: `Customers will not see ${account.bank_name} ${account.account_number}.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(account.id)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Bank accounts</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Customers see the active accounts after they place a bank transfer order.
        </Text>
      </div>
      {isLoading ? (
        <Text className="px-6 py-4">Loading the bank accounts.</Text>
      ) : accounts.length === 0 ? (
        <Text className="px-6 py-4">There are no bank accounts.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Bank</Table.HeaderCell>
              <Table.HeaderCell>Account number</Table.HeaderCell>
              <Table.HeaderCell>Account holder</Table.HeaderCell>
              <Table.HeaderCell>Active</Table.HeaderCell>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {accounts.map((account, index) => (
              <Table.Row key={account.id}>
                <Table.Cell>{account.bank_name}</Table.Cell>
                <Table.Cell>{account.account_number}</Table.Cell>
                <Table.Cell>{account.account_holder}</Table.Cell>
                <Table.Cell>
                  <Switch
                    aria-label={`Active ${account.bank_name}`}
                    checked={account.is_active}
                    onCheckedChange={(is_active) => setActive.mutate({ id: account.id, is_active })}
                  />
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-x-1">
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label="Up"
                      disabled={index === 0 || move.isPending}
                      onClick={() => move.mutate(moveAccount(accounts, account.id, "up"))}
                    >
                      <ArrowUpMini />
                    </IconButton>
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label="Down"
                      disabled={index === accounts.length - 1 || move.isPending}
                      onClick={() => move.mutate(moveAccount(accounts, account.id, "down"))}
                    >
                      <ArrowDownMini />
                    </IconButton>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-x-1">
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label="Edit"
                      onClick={() => onEdit(account)}
                    >
                      <PencilSquare />
                    </IconButton>
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label="Delete"
                      onClick={() => onDelete(account)}
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

const BankTransferPage = () => {
  const [editing, setEditing] = useState<AdminBankAccount | null>(null)

  return (
    <div className="flex flex-col gap-y-3">
      <AccountsSection onEdit={setEditing} />
      <AccountFormSection editing={editing} onDone={() => setEditing(null)} />
      <Toaster />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Bank transfer",
})

export default BankTransferPage
