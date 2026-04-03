// Chuẩn hóa tất cả API response
export const ok = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data })
}

export const created = (res, data, message = 'Created') => {
  return ok(res, data, message, 201)
}

export const fail = (res, message = 'Error', statusCode = 400, errors = null) => {
  return res.status(statusCode).json({ success: false, message, errors })
}

export const notFound = (res, message = 'Not found') => {
  return fail(res, message, 404)
}

export const unauthorized = (res, message = 'Unauthorized') => {
  return fail(res, message, 401)
}

export const forbidden = (res, message = 'Forbidden') => {
  return fail(res, message, 403)
}
