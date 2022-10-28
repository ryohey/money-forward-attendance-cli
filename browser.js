import keytar from "keytar"
import promptly from "promptly"
import { launch } from "puppeteer"

const service = "money-forward-attendance-cli"

/*
 keytar には account/password のペアで保存するので、
 office と email を結合した文字列を account として扱う
 */
function joinAccount(office, email) {
  return [office, email].join("\t")
}

function splitAccount(account) {
  const c = account.split("\t")
  return { office: c[0], email: c[1] }
}

async function getCredentials() {
  const credentials = await keytar.findCredentials(service)

  if (credentials.length > 0) {
    const cred = credentials[0]
    console.log("Use saved password from the keychain")
    return {
      ...splitAccount(cred.account),
      password: cred.password,
    }
  }

  const email = await promptly.prompt("Type your email or account name: ")
  const office = await promptly.prompt("Type company account name: ")
  const password = await promptly.password("Type your password: ")
  const account = joinAccount(office, email)

  keytar.setPassword(service, account, password)
  console.log("Password saved in the keychain")

  return { office, email, password }
}

async function getAuthorizedPage(browser) {
  const { office, email, password } = await getCredentials()

  console.log("Try authorization")
  const page = await browser.newPage()

  await page.goto("https://attendance.moneyforward.com/employee_session/new")

  await page.setViewport({ width: 1412, height: 941 })

  await page.waitForSelector("#employee_session_form_office_account_name")
  await page.type("#employee_session_form_office_account_name", office)

  await page.waitForSelector("#employee_session_form_account_name_or_email")
  await page.type("#employee_session_form_account_name_or_email", email)

  await page.waitForSelector("#employee_session_form_password")
  await page.type("#employee_session_form_password", password)

  await page.waitForSelector(
    ".attendance-before-login-card-contents > .attendance-before-login-card-button > form > .attendance-before-login-card-button > .attendance-button-email"
  )
  await page.click(
    ".attendance-before-login-card-contents > .attendance-before-login-card-button > form > .attendance-before-login-card-button > .attendance-button-email"
  )

  await page.waitForNavigation()
  console.log("Authorization successful")

  return page
}

export async function clockIn() {
  const browser = await launch()
  const page = await getAuthorizedPage(browser)

  await page.waitForSelector(
    ".tw-flex > .tw-relative > .button-list > .clock_in > .time-stamp-button"
  )
  await page.click(
    ".tw-flex > .tw-relative > .button-list > .clock_in > .time-stamp-button"
  )

  await page.waitForNavigation()
  await browser.close()
  console.log("Clock-in success")
}

export async function clockOut() {
  const browser = await launch()
  const page = await getAuthorizedPage(browser)

  await page.waitForSelector(
    ".tw-flex > .tw-relative > .button-list > .clock_out > .time-stamp-button"
  )
  await page.click(
    ".tw-flex > .tw-relative > .button-list > .clock_out > .time-stamp-button"
  )

  await page.waitForNavigation()
  await browser.close()
  console.log("Clock-out success")
}
