#!/usr/bin/env node
import { clockIn, clockOut } from "./browser.js"

try {
  if (process.argv[2] === undefined) {
    throw new Error("Please provide the command (clock)")
  }
  switch (process.argv[2]) {
    case "clock":
      if (process.argv[3] === undefined) {
        throw new Error("Please provide the command (in|out)")
      }
      switch (process.argv[3]) {
        case "in":
          await clockIn()
          break
        case "out":
          await clockOut()
          break
        default:
          throw new Error(`unknown option: ${process.argv[3]}`)
      }
      break
    default:
      throw new Error(`unknown option: ${process.argv[2]}`)
  }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
