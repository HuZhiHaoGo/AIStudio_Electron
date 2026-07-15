import type {
  DifyAppMode, DifyCapabilities, DifyFileCapabilities, DifyInputField, DifyInputType,
} from '../../../shared/types/app';

const inputTypes = new Set<DifyInputType>(['text-input', 'paragraph', 'select', 'number', 'file', 'file-list']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeMode(value: unknown, fallback: DifyAppMode): DifyAppMode {
  return ['chat', 'advanced-chat', 'agent-chat', 'workflow', 'completion'].includes(String(value))
    ? value as DifyAppMode
    : fallback;
}

export function parseCapabilities(parametersValue: unknown, mode: DifyAppMode): DifyCapabilities {
  const parameters = record(parametersValue);
  const inputFields: DifyInputField[] = [];
  for (const entry of Array.isArray(parameters.user_input_form) ? parameters.user_input_form : []) {
    const wrapper = record(entry);
    const [rawType, rawValue] = Object.entries(wrapper)[0] || [];
    if (!rawType || !inputTypes.has(rawType as DifyInputType)) continue;
    const value = record(rawValue);
    inputFields.push({
      type: rawType as DifyInputType,
      variable: String(value.variable || ''),
      label: String(value.label || value.variable || ''),
      required: Boolean(value.required),
      default: typeof value.default === 'number' ? value.default : String(value.default || ''),
      options: strings(value.options),
      maxLength: typeof value.max_length === 'number' ? value.max_length : undefined,
      allowedFileTypes: strings(value.allowed_file_types),
      allowedFileExtensions: strings(value.allowed_file_extensions),
    });
  }

  const upload = record(parameters.file_upload);
  const uploadConfig = record(upload.fileUploadConfig);
  const fileUpload: DifyFileCapabilities = {
    enabled: Boolean(upload.enabled),
    allowedFileTypes: strings(upload.allowed_file_types),
    allowedFileExtensions: strings(upload.allowed_file_extensions),
    allowedUploadMethods: strings(upload.allowed_file_upload_methods).filter(
      (item): item is 'local_file' | 'remote_url' => item === 'local_file' || item === 'remote_url',
    ),
    numberLimits: Number(upload.number_limits || uploadConfig.batch_count_limit || 1),
    fileSizeLimitMb: Number(uploadConfig.file_size_limit) || undefined,
    imageFileSizeLimitMb: Number(uploadConfig.image_file_size_limit) || undefined,
    audioFileSizeLimitMb: Number(uploadConfig.audio_file_size_limit) || undefined,
    videoFileSizeLimitMb: Number(uploadConfig.video_file_size_limit) || undefined,
  };

  return {
    loaded: true,
    supportsConversation: mode === 'chat' || mode === 'advanced-chat' || mode === 'agent-chat',
    supportsWorkflow: mode === 'workflow',
    supportsCompletion: mode === 'completion',
    supportsFileUpload: fileUpload.enabled || inputFields.some((field) => field.type === 'file' || field.type === 'file-list'),
    supportsFeedback: mode !== 'workflow',
    supportsSuggestedQuestions: Boolean(record(parameters.suggested_questions_after_answer).enabled),
    supportsSpeechToText: Boolean(record(parameters.speech_to_text).enabled),
    supportsTextToSpeech: Boolean(record(parameters.text_to_speech).enabled),
    supportsAnnotations: mode !== 'workflow',
    supportsHitl: mode === 'workflow',
    inputFields,
    fileUpload,
    openingStatement: typeof parameters.opening_statement === 'string' ? parameters.opening_statement : undefined,
    openingSuggestedQuestions: strings(parameters.suggested_questions),
  };
}

export function defaultCapabilities(mode: DifyAppMode): DifyCapabilities {
  return parseCapabilities({}, mode);
}
