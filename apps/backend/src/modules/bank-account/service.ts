import { MedusaService } from "@medusajs/framework/utils"
import BankAccount from "./models/bank-account"

class BankAccountModuleService extends MedusaService({ BankAccount }) {}

export default BankAccountModuleService
