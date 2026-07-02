export function mapearErroCampos(detalhes) {
  const out = {}
  if (Array.isArray(detalhes)) for (const i of detalhes) {
    const campo = i.path?.[0]; if (campo && !out[campo]) out[campo] = i.message
  }
  return out
}
