import type { Citation } from '../../../shared/types/citation';

export function validateAndRenumberCitations(answer: string, citations: Citation[], allowedChunkIds?: Set<string>) {
  const seen = new Set<string>();
  const valid = citations.filter((citation) => {
    if (!citation.chunkId || !citation.content) return false;
    if (allowedChunkIds && !allowedChunkIds.has(citation.chunkId)) return false;
    if (seen.has(citation.chunkId)) return false;
    seen.add(citation.chunkId);
    return true;
  });

  const referenced = new Set(Array.from(answer.matchAll(/\[(\d+)]/g), (match) => Number(match[1])));
  const selected = referenced.size ? valid.filter((citation) => referenced.has(citation.number)) : valid;
  const numberMap = new Map(selected.map((citation, index) => [citation.number, index + 1]));
  const normalizedAnswer = answer.replace(/\[(\d+)]/g, (marker, rawNumber: string) => {
    const next = numberMap.get(Number(rawNumber));
    return next ? `[${next}]` : '';
  }).replace(/ {2,}/g, ' ').trim();

  return {
    answer: normalizedAnswer,
    citations: selected.map((citation, index) => ({ ...citation, number: index + 1 })),
  };
}

