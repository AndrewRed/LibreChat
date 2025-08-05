jest.mock(
  '@librechat/data-schemas',
  () => ({
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock(
  '@librechat/api',
  () => ({
    sendEvent: jest.fn(),
    MCPOAuthHandler: { generateFlowId: jest.fn() },
    normalizeServerName: jest.fn((name) => name),
    convertWithResolvedRefs: jest.fn(() => null),
  }),
  { virtual: true },
);

jest.mock(
  '@librechat/agents',
  () => ({
    Constants: { CONTENT_AND_ARTIFACT: 'artifact' },
    Providers: { VERTEXAI: 'vertexai', GOOGLE: 'google' },
    GraphEvents: { ON_RUN_STEP_DELTA: 'on_run_step_delta' },
  }),
  { virtual: true },
);

jest.mock(
  'librechat-data-provider',
  () => ({
    Time: { TWO_MINUTES: 120000 },
    CacheKeys: { FLOWS: 'flows' },
    StepTypes: { TOOL_CALLS: 'tool_calls' },
    Constants: { mcp_delimiter: '::', mcp_prefix: 'mcp_' },
    ContentTypes: { TEXT: 'text' },
    isAssistantsEndpoint: () => false,
  }),
  { virtual: true },
);

jest.mock('~/config', () => ({
  getMCPManager: jest.fn(),
  getFlowStateManager: jest.fn(),
}));

jest.mock('~/cache', () => ({
  getLogStores: jest.fn(() => ({})),
}));

jest.mock('./Config', () => ({
  getCachedTools: jest.fn(),
}));

jest.mock('~/models', () => ({
  findToken: jest.fn(),
  createToken: jest.fn(),
  updateToken: jest.fn(),
}));

jest.mock('@langchain/core/tools', () => ({
  tool: (callFn) => ({ _call: callFn, mcp: true }),
}));

const { createMCPTool } = require('./MCP');

const { getMCPManager, getFlowStateManager } = require('~/config');
const { getCachedTools } = require('./Config');

describe('createMCPTool argument parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMCPManager.mockReturnValue({ callTool: jest.fn(async (opts) => opts) });
    getFlowStateManager.mockReturnValue({});
    getCachedTools.mockResolvedValue({
      'tool::server': {
        function: { description: '', parameters: {} },
      },
    });
  });

  it('parses stringified JSON arguments before calling mcp tool', async () => {
    const req = { user: { id: 'user-1' } };
    const res = {};
    const tool = await createMCPTool({
      req,
      res,
      toolKey: 'tool::server',
      provider: 'openai',
    });

    const config = { metadata: { thread_id: 't1', run_id: 'r1' } };
    await tool._call('{"foo":"bar"}', config);

    const callTool = getMCPManager().callTool;
    expect(callTool).toHaveBeenCalled();
    expect(callTool.mock.calls[0][0].toolArguments).toEqual({ foo: 'bar' });
  });
});

