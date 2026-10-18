import { Module } from "@medusajs/framework/utils"
import MagicLinkModuleService from "./service"

export const MAGIC_LINK_MODULE = "magicLink"

export default Module(MAGIC_LINK_MODULE, {
  service: MagicLinkModuleService,
})
