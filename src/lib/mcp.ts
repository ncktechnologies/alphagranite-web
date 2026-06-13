import axios from 'axios';
import { format, isValid, parseISO } from 'date-fns';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface McpToolSummary {
  name: string;
  description?: string;
  title?: string;
  category?: string;
  tags?: string[];
  input_schema?: JsonObject;
  output_schema?: JsonObject;
  sample_params?: Record<string, unknown>;
  example_params?: Record<string, unknown>;
  result_kind?: string;
  row_count?: number;
}

export interface McpToolDetails extends McpToolSummary {
  long_description?: string;
  instructions?: string;
  planner_hint?: string;
  aliases?: string[];
  schema?: JsonObject;
}

export interface McpPlannerCandidate {
  tool_name?: string;
  name?: string;
  confidence?: number;
  rationale?: string;
  score?: number;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export type McpAskRequestResponseMode = 'brief' | 'standard' | 'deep';

export type McpAskRequestFocus = 'finance' | 'operations' | 'dispatch' | 'quality' | 'mixed';

export interface McpAskRequest {
  question: string;
  params?: Record<string, unknown>;
  response_mode?: McpAskRequestResponseMode;
  focus?: McpAskRequestFocus;
  allow_context_pack?: boolean;
  prefer_sql?: boolean;
}

export type McpFeedbackValue = -1 | 0 | 1;

export interface McpRelatedQaItem {
  question: string;
  answer_summary?: string;
  mode?: string;
  relevance?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface McpAdvisorDetails {
  executive_summary?: string;
  what_this_means?: string;
  key_findings?: string[];
  metric_breakdown?: Array<Record<string, unknown>> | Record<string, unknown>;
  risk_flags?: string[];
  recommended_actions?: string[];
  assumptions_and_gaps?: string[];
  next_questions?: string[];
  priority?: string;
  conversation_reply?: string;
  evidence?: unknown;
  [key: string]: unknown;
}

export interface McpContextPackResult {
  tools_run?: Array<Record<string, unknown>>;
  tool_errors?: Array<Record<string, unknown> | string>;
  merged?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpSqlResult {
  columns?: string[];
  rows?: Array<Record<string, unknown>> | unknown[][];
  row_count?: number;
  truncated?: boolean;
  sql?: string;
  [key: string]: unknown;
}

export interface McpAskResponse {
  question?: string;
  matched_tool?: string;
  confidence?: number;
  rationale?: string;
  source?: string;
  provider?: string;
  model?: string;
  mode?: 'report' | 'context_pack' | 'sql' | 'conversational' | (string & {});
  planner_candidates?: McpPlannerCandidate[];
  resolved_params?: Record<string, unknown>;
  insights?: unknown;
  advisor?: string | McpAdvisorDetails;
  advisor_provider?: string;
  advisor_model?: string;
  related_qa?: McpRelatedQaItem[];
  history_id?: number;
  result?: unknown | McpContextPackResult | McpSqlResult;
  row_count?: number;
  result_kind?: string;
  [key: string]: unknown;
}

export interface McpRecentQuery {
  id: string;
  question: string;
  matchedTool?: string;
  confidence?: number;
  createdAt: string;
}

export interface McpResultSummary {
  kind: 'empty' | 'scalar' | 'object' | 'array' | 'table' | 'large-table' | 'mixed';
  rowCount: number;
  keyCount: number;
  approximateSize: number;
  hasNestedData: boolean;
}

export const MCP_RECENT_QUERY_KEY = 'mcp-recent-queries';

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

const mcpClient = axios.create({
  baseURL: baseUrl,
  headers: {
    Accept: 'application/json',
  },
});

mcpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') ?? '';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const unwrapMcpPayload = <T>(payload: any): T => {
  if (payload == null) return payload;
  return (payload?.data ?? payload?.result ?? payload) as T;
};

export const fetchMcpTools = async (): Promise<McpToolSummary[]> => {
  const response = await mcpClient.get('/api/v1/mcp/tools');
  const payload = unwrapMcpPayload<any>(response.data);
  const tools = Array.isArray(payload) ? payload : payload?.tools ?? payload?.items ?? [];
  return tools;
};

export const fetchMcpToolDetails = async (toolName: string): Promise<McpToolDetails> => {
  const response = await mcpClient.get(`/api/v1/mcp/tools/${encodeURIComponent(toolName)}`);
  return unwrapMcpPayload<McpToolDetails>(response.data);
};

export const invokeMcpTool = async (toolName: string, params: Record<string, unknown>) => {
  const response = await mcpClient.post(`/api/v1/mcp/tools/${encodeURIComponent(toolName)}/invoke`, params);
  return unwrapMcpPayload<any>(response.data);
};

export const askMcp = async (payload: McpAskRequest) => {
  const response = await mcpClient.post('/api/v1/mcp/ask', {
    question: payload.question,
    params: payload.params ?? {},
    response_mode: payload.response_mode,
    focus: payload.focus,
    allow_context_pack: payload.allow_context_pack,
    prefer_sql: payload.prefer_sql,
  });
  return unwrapMcpPayload<McpAskResponse>(response.data);
};

export const submitMcpFeedback = async (payload: { history_id: number; feedback: McpFeedbackValue }) => {
  const response = await mcpClient.post('/api/v1/mcp/feedback', payload);
  return unwrapMcpPayload<Record<string, unknown>>(response.data);
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const MCP_WRAPPER_KEYS = new Set([
  'tool',
  'title',
  'description',
  'executed_at',
  'executedAt',
  'source',
  'provider',
  'model',
  'confidence',
  'rationale',
  'status',
]);

const MCP_PAYLOAD_KEYS = ['result', 'data', 'payload', 'output', 'value', 'rows', 'items', 'records', 'entries', 'content'];

export const unwrapMcpDisplayPayload = (value: unknown): unknown => {
  if (!isPlainObject(value)) return value;

  const payloadKey = MCP_PAYLOAD_KEYS.find((key) => key in value);
  if (!payloadKey) return value;

  const keys = Object.keys(value);
  const hasWrapperShape = keys.some((key) => MCP_WRAPPER_KEYS.has(key)) || keys.some((key) => key.startsWith('executed_'));

  if (!hasWrapperShape) return value;

  const payload = value[payloadKey];
  return payload === undefined ? value : unwrapMcpDisplayPayload(payload);
};

export const estimateJsonSize = (value: unknown): number => {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return 0;
  }
};

export const formatDisplayValue = (value: unknown): string => {
  return formatDisplayValueForKey(value);
};

const isCurrencyFieldName = (fieldName?: string): boolean => {
  if (!fieldName) return false;

  const normalized = fieldName.toLowerCase();
  if (normalized.includes('percent') || normalized.includes('rate') || normalized.includes('margin')) return false;

  return /(^|_)(revenue|profit|cost|price|amount|sales)(_|$)/.test(normalized);
};

export const formatDisplayValueForKey = (value: unknown, fieldName?: string): string => {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (typeof value === 'number') {
    if (isCurrencyFieldName(fieldName)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value);
    }

    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }

  if (value instanceof Date) {
    return isValid(value) ? format(value, 'PP p') : String(value);
  }

  if (typeof value === 'string') {
    const parsedDate = parseISO(value);
    if (isValid(parsedDate) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return format(parsedDate, 'PP p');
    }

    return value;
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (isPlainObject(value)) {
    return 'Nested data';
  }

  return String(value);
};

export const formatToolDisplayName = (name?: string, title?: string): string => {
  if (title?.trim()) return title.trim();
  if (!name) return 'Tool';

  const cleaned = name
    .split(/[./]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Tool';

  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatFieldLabel = (name: string, title?: string): string => {
  if (title?.trim()) return title.trim();
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bApi\b/g, 'API');
};

export const getYearOptions = (centerYear = new Date().getFullYear(), range = 5) => {
  return Array.from({ length: range * 2 + 1 }, (_, index) => {
    const year = centerYear - range + index;
    return { label: String(year), value: year };
  });
};

export const getMonthOptions = () => {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ].map((label, index) => ({ label, value: index + 1 }));
};

export const getCommonFieldOptions = (fieldName: string, fieldType?: string) => {
  const normalized = fieldName.toLowerCase();

  if (/^month$|_month$|month_/.test(normalized)) {
    return getMonthOptions();
  }

  if (/^year$|_year$|year_/.test(normalized)) {
    return getYearOptions();
  }

  if (fieldType === 'boolean') {
    return [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ];
  }

  return [] as Array<{ label: string; value: string | number | boolean }>;
};

export const inferResultSummary = (result: unknown): McpResultSummary => {
  if (result === null || result === undefined) {
    return {
      kind: 'empty',
      rowCount: 0,
      keyCount: 0,
      approximateSize: 0,
      hasNestedData: false,
    };
  }

  if (Array.isArray(result)) {
    const firstRow = result.find(isPlainObject);
    const keyCount = firstRow ? Object.keys(firstRow).length : 0;
    const approximateSize = estimateJsonSize(result);
    return {
      kind: result.length > 25 || approximateSize > 12000 ? 'large-table' : result.length > 5 ? 'table' : 'array',
      rowCount: result.length,
      keyCount,
      approximateSize,
      hasNestedData: result.some((item) => Array.isArray(item) || isPlainObject(item)),
    };
  }

  if (isPlainObject(result)) {
    const objectValues = Object.values(result);
    const nestedArrays = objectValues.filter(Array.isArray);
    const nestedObjects = objectValues.filter(isPlainObject);
    const scalarKeys = Object.keys(result).filter((key) => {
      const value = result[key];
      return value === null || ['string', 'number', 'boolean'].includes(typeof value) || value instanceof Date;
    });

    const arrayCandidate = nestedArrays.find((value) => value.length > 0 && value.every((row) => isPlainObject(row)));
    if (arrayCandidate) {
      const approximateSize = estimateJsonSize(result);
      return {
        kind: arrayCandidate.length > 25 || approximateSize > 15000 ? 'large-table' : arrayCandidate.length > 5 ? 'table' : 'array',
        rowCount: arrayCandidate.length,
        keyCount: firstObjectKeyCount(arrayCandidate),
        approximateSize,
        hasNestedData: true,
      };
    }

    return {
      kind: scalarKeys.length > 0 ? 'object' : nestedObjects.length > 0 ? 'mixed' : 'scalar',
      rowCount: 0,
      keyCount: Object.keys(result).length,
      approximateSize: estimateJsonSize(result),
      hasNestedData: nestedArrays.length > 0 || nestedObjects.length > 0,
    };
  }

  return {
    kind: 'scalar',
    rowCount: 0,
    keyCount: 0,
    approximateSize: estimateJsonSize(result),
    hasNestedData: false,
  };
};

export const extractTableRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return result.filter(isPlainObject) as Record<string, unknown>[];
  }

  if (!isPlainObject(result)) {
    return [];
  }

  const candidateKeys = ['rows', 'items', 'data', 'records', 'results', 'entries'];
  for (const key of candidateKeys) {
    const value = result[key];
    if (Array.isArray(value) && value.every(isPlainObject)) {
      return value as Record<string, unknown>[];
    }
  }

  return [];
};

export const getSummaryScalars = (result: unknown): Array<{ key: string; label: string; value: unknown }> => {
  if (!isPlainObject(result)) return [];

  return Object.entries(result)
    .filter(([, value]) => {
      return value === null || ['string', 'number', 'boolean'].includes(typeof value) || value instanceof Date;
    })
    .slice(0, 8)
    .map(([key, value]) => ({ key, label: formatFieldLabel(key), value }));
};

export const getObjectEntries = (value: unknown): Array<{ label: string; value: unknown }> => {
  if (!isPlainObject(value)) return [];
  return Object.entries(value).map(([label, entryValue]) => ({ label, value: entryValue }));
};

export type NarrativeSections = {
  summary?: string;
  whatThisMeans?: string;
  likelyCauses?: string[];
  recommendedActions?: string[];
  priority?: string;
  followUpQuestion?: string;
  conversationReply?: string;
};

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter((item): item is string => Boolean(item && item.trim()));
};

export const extractNarrativeSections = (value: unknown): NarrativeSections | null => {
  if (!isPlainObject(value)) return null;

  const summary =
    toText(value.summary) ??
    toText(value.overview) ??
    toText(value.headline) ??
    toText(value.conversation_reply) ??
    toText(value.conversationReply);

  const whatThisMeans =
    toText(value.what_this_means) ??
    toText(value.whatThisMeans) ??
    toText(value.meaning) ??
    toText(value.interpretation);

  const likelyCauses =
    toTextList(value.likely_causes) ??
    toTextList(value.likelyCauses) ??
    toTextList(value.causes);

  const recommendedActions =
    toTextList(value.recommended_actions) ??
    toTextList(value.recommendedActions) ??
    toTextList(value.next_steps) ??
    toTextList(value.nextSteps);

  const priority = toText(value.priority);

  const followUpQuestion =
    toText(value.follow_up_question) ??
    toText(value.followUpQuestion) ??
    toText(value.follow_up);

  const conversationReply = toText(value.conversation_reply) ?? toText(value.conversationReply);

  const hasAny = summary || whatThisMeans || likelyCauses.length || recommendedActions.length || priority || followUpQuestion || conversationReply;

  if (!hasAny) return null;

  return {
    summary,
    whatThisMeans,
    likelyCauses,
    recommendedActions,
    priority,
    followUpQuestion,
    conversationReply,
  };
};

export const isNarrativeObject = (value: unknown): boolean => Boolean(extractNarrativeSections(value));

export const getColumnKeys = (rows: Record<string, unknown>[]): string[] => {
  const keys = new Set<string>();
  rows.slice(0, 50).forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys).slice(0, 12);
};

export const toCsv = (rows: Record<string, unknown>[], columns: string[]) => {
  const header = columns.join(',');
  const body = rows
    .map((row) =>
      columns
        .map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  return [header, body].filter(Boolean).join('\n');
};

export const downloadCsv = (rows: Record<string, unknown>[], columns: string[], filename: string) => {
  if (rows.length === 0 || columns.length === 0) return;

  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const firstObjectKeyCount = (rows: unknown[]): number => {
  const firstObject = rows.find(isPlainObject);
  return firstObject ? Object.keys(firstObject).length : 0;
};
