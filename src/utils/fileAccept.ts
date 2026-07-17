const documentExtensions = [
  '.txt', '.md', '.markdown', '.pdf', '.html', '.htm', '.xlsx', '.xls', '.docx', '.doc',
  '.csv', '.eml', '.msg', '.pptx', '.ppt', '.xml', '.epub',
];

function normalizeExtension(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed ? (trimmed.startsWith('.') ? trimmed : `.${trimmed}`) : '';
}

/** Converts Dify file capabilities into the browser/Electron file dialog accept format. */
export function buildFileAccept(allowedExtensions: string[] = [], allowedTypes: string[] = []) {
  const extensions = allowedExtensions.map(normalizeExtension).filter(Boolean);
  const types = new Set(allowedTypes.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const accept = new Set<string>();

  if (!types.size) extensions.forEach((extension) => accept.add(extension));
  if (types.has('image')) {
    const imageExtensions = extensions.filter((extension) => /\.(jpe?g|png|gif|webp|svg|bmp|tiff?|heic|heif)$/.test(extension));
    (imageExtensions.length ? imageExtensions : ['image/*']).forEach((value) => accept.add(value));
  }
  if (types.has('document')) documentExtensions.forEach((extension) => accept.add(extension));
  if (types.has('audio')) accept.add('audio/*');
  if (types.has('video')) accept.add('video/*');
  if (types.has('custom')) extensions.forEach((extension) => accept.add(extension));

  // Unknown Dify types should not accidentally hide files that Dify explicitly listed by extension.
  if (!accept.size || [...types].some((type) => !['image', 'document', 'audio', 'video', 'custom'].includes(type))) {
    extensions.forEach((extension) => accept.add(extension));
  }

  return [...accept].join(',') || undefined;
}
