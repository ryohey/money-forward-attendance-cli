import keytar from "keytar-sync"
import promptly from "promptly"
import { select } from "@inquirer/prompts"
import assert from "assert"
import { launch } from "puppeteer"

const serviceMoneyForwardID = "money-forward-attendance-cli (MoneyForward ID)"
const serviceMoneyForwardCompanyID =
  "money-forward-attendance-cli (MoneyForward Company ID)"

async function getMFIDCredentials() {
  const credentials = await keytar.findCredentials(serviceMoneyForwardID)

  if (credentials.length > 0) {
    const cred = credentials[0]
    console.log("Use saved password for MoneyForward ID from the keychain")
    return { email: cred.account, password: cred.password }
  }

  console.log("Input your MoneyForward ID credentials")

  const account = await promptly.prompt("Type your email: ")
  assert(account.length > 0, "Invalid email")

  const password = await promptly.password("Type your password: ")
  assert(password.length > 0, "Invalid password")

  keytar.setPassword(serviceMoneyForwardID, account, password)
  console.log("Password saved in the keychain")

  return { email: account, password }
}

async function authorizeMoneyForwardID(page) {
  const { email, password } = await getMFIDCredentials()

  await page.goto("https://attendance.moneyforward.com/employee_session/new")

  await page.waitForSelector(".attendance-button-mfid")
  await page.click(".attendance-button-mfid")

  // https://id.moneyforward.com/sign_in/email へリダイレクトされる
  // MoneyForward ID でログインする

  // メールアドレス入力
  await page.waitForSelector('input[type="email"]')
  await page.type('input[type="email"]', email)

  // 送信ボタンクリック
  await page.waitForSelector("#submitto")
  await page.click("#submitto")

  // パスワード入力
  await page.waitForSelector("input[type=password]")
  await page.type("input[type=password]", password)

  // 送信ボタンクリック
  await page.waitForSelector("#submitto")
  await page.click("#submitto")

  await page.waitForNavigation()

  // 事業者選択
  const companies = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".attendance-table-contents tr"))
      .map((e) => Array.from(e.querySelectorAll("td")))
      .filter((tr) => tr.length === 3)
      .map((tr) => ({
        id: tr[0].textContent,
        name: tr[1].textContent,
        link: tr[2].querySelector(".attendance-button-primary").attributes.href
          .value,
      }))
      .map((c) => ({
        name: `${c.name} (${c.id})`,
        value: c.link,
      }))
  )

  console.dir(companies)

  let selectedCompanyLink = await keytar.findPassword(
    serviceMoneyForwardCompanyID,
    email
  )

  if (selectedCompanyLink === null) {
    selectedCompanyLink = await select({
      message: "Choose your company",
      choices: companies,
    })
    await keytar.setPassword(
      serviceMoneyForwardCompanyID,
      email,
      selectedCompanyLink
    )
    console.log("Company saved in the keychain")
  } else {
    console.log("Use saved company from the keychain")
  }

  await page.click(`a[href='${selectedCompanyLink}']`)

  await page.waitForNavigation()

  console.log("Authorization successful")
}

async function getAuthorizedPage(browser) {
  console.log("Try authorization")
  const page = await browser.newPage()
  await page.setViewport({ width: 1412, height: 941 })

  await authorizeMoneyForwardID(page)

  return page
}

export async function clockIn(headless) {
  const browser = await launch({ headless })
  const page = await getAuthorizedPage(browser)

  await page.goto("https://attendance.moneyforward.com/my_page")

  await page.waitForSelector(
    ".tw-flex > .tw-relative > .button-list > .clock_in > .time-stamp-button"
  )
  await page.click(
    ".tw-flex > .tw-relative > .button-list > .clock_in > .time-stamp-button"
  )

  await page.waitForSelector(".action-message.success")
  const message = await page.evaluate(() =>
    document.querySelector(".action-message.success").textContent.trim()
  )
  console.log(message)

  await browser.close()
  console.log("Clock-in success")
}

export async function clockOut(headless) {
  const browser = await launch(headless)
  const page = await getAuthorizedPage(browser)

  await page.goto("https://attendance.moneyforward.com/my_page")

  await page.waitForSelector(
    ".tw-flex > .tw-relative > .button-list > .clock_out > .time-stamp-button"
  )
  await page.click(
    ".tw-flex > .tw-relative > .button-list > .clock_out > .time-stamp-button"
  )

  await page.waitForSelector(".action-message.success")
  const message = await page.evaluate(() =>
    document.querySelector(".action-message.success").textContent.trim()
  )
  console.log(message)

  await browser.close()
  console.log("Clock-out success")
}
