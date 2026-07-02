export async function redimensionarImagem(file, tamanho = 256, qualidade = 0.8) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const lado = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - lado) / 2, sy = (bitmap.height - lado) / 2
  const canvas = document.createElement('canvas')
  canvas.width = tamanho; canvas.height = tamanho
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, tamanho, tamanho)
  let q = qualidade, url = canvas.toDataURL('image/jpeg', q)
  while (url.length > 400 * 1024 && q > 0.4) { q -= 0.1; url = canvas.toDataURL('image/jpeg', q) }
  return url
}
