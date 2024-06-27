import { extractPackageJson } from '@fethcat/shared/helpers'
import { logsValidators, validateEnv } from '@fethcat/validator'
import { randomBytes } from 'crypto'
import { num, str } from 'envalid'

const { name, version } = extractPackageJson()

const env = validateEnv({
  ...logsValidators,
  PORT: num({ default: 3000 }),
  LINKEDIN_PWD: str(),
  LINKEDIN_USER: str(),
  OPENAI_API_KEY: str(),
  LINKEDIN_ERROR_PATH: str({ default: '/usr/app/linkbot-errors/last_error_screenshot.png' }),
  REFRESH_INTERVAL: num({ default: 1000 * 60 }),
  REFRESH_OFFSET: num({ default: 1000 * 15 }),
})

const instanceId = randomBytes(16).toString('hex')

export const settings = {
  instanceId,
  metadata: { app: name, version, port: env.PORT, env: env.APP_STAGE },
  logs: {
    silent: env.LOG_SILENT,
  },
  linkedin: {
    password: env.LINKEDIN_PWD,
    username: env.LINKEDIN_USER,
    errorPath: env.LINKEDIN_ERROR_PATH,
  },
  openAi: {
    key: env.OPENAI_API_KEY,
  },
  refresh: { interval: env.REFRESH_INTERVAL, offset: env.REFRESH_OFFSET },
}

const messages = [
  'linkedin_answer',
  'linkedin_extract',
  'linkedin_job',
  'linkedin_login',
  'main_job',
  'open_ai_interpret',
  'puppeteer_browser_disconnected',
  'puppeteer_create_page',
  'puppeteer_init',
  'puppeteer_reset_browser',
  'puppeteer_run_browser',
  'puppeteer_screenshot',
  'puppeteer_screenshot_success',
  'puppeteer_stop_browser',
  'puppeteer_user_agent',
] as const

export type Message = (typeof messages)[number]
