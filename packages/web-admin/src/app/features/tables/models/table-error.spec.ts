import { tableErrorMessage } from './table-error'

describe('tableErrorMessage', () => {
  it('usa el message en español de la API', () => {
    const err = { status: 409, error: { error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con el número 3 en este restaurante' } }
    expect(tableErrorMessage(err, 'fallback')).toBe('Ya existe una mesa con el número 3 en este restaurante')
  })

  it('usa el fallback si la respuesta no trae message', () => {
    expect(tableErrorMessage({ status: 500, error: null }, 'No se pudo guardar la mesa.')).toBe('No se pudo guardar la mesa.')
  })

  it('traduce un 403 a un mensaje de permisos', () => {
    expect(tableErrorMessage({ status: 403, error: { error: 'Forbidden: Insufficient permissions' } }, 'x'))
      .toBe('No tienes permisos para realizar esta acción.')
  })

  it('traduce un 404 sin message', () => {
    expect(tableErrorMessage({ status: 404, error: {} }, 'x')).toBe('La mesa no existe.')
  })

  it('avisa de problemas de conexión (status 0)', () => {
    expect(tableErrorMessage({ status: 0 }, 'x')).toBe('No se pudo conectar con el servidor.')
  })

  it('isTableInUse reconoce el 409 TableInUseError', async () => {
    const { isTableInUse } = await import('./table-error')
    expect(isTableInUse({ status: 409, error: { error: 'TableInUseError', message: 'm' } })).toBe(true)
    expect(isTableInUse({ status: 409, error: { error: 'DuplicatedTableNumberError' } })).toBe(false)
    expect(isTableInUse(null)).toBe(false)
  })
})
