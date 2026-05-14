export function success(data) {
  return { code: 0, message: '成功', data }
}

export function successWithTotal(data, total) {
  return { code: 0, message: '成功', data, total }
}

export function error(message, code = -1) {
  return { code, message }
}
