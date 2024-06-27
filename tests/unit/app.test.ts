import { MockedLogger, mockAction } from '@fethcat/logger'
import { App } from '../../src/app.js'

vi.mock('../../src/jobs/MainJob')

describe('run', () => {
  function createApp() {
    const app = new App()
    app['logger'] = new MockedLogger()
    app['exit'] = vi.fn()
    return app
  }

  it('should log success', () => {
    const app = createApp()
    const { success } = mockAction(app['logger'])
    app.run()
    expect(success).toHaveBeenCalled()
  })
})
