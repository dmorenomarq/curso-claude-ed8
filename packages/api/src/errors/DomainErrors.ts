import { AppError } from '@errors/AppError.js'

export class FirstNameRequiredError extends AppError {
  constructor() {
    super('First name is required')
  }
}

export class LastNameRequiredError extends AppError {
  constructor() {
    super('Last name is required')
  }
}

export class PasswordHashRequiredError extends AppError {
  constructor() {
    super('Password hash is required')
  }
}

export class InvalidRoleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid role')
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super('Invalid email format')
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid credentials')
  }
}

export class DuplicatedEmailError extends AppError {
  constructor() {
    super('Email is already in use')
  }
}

export class EmployeeNotFoundError extends AppError {
  constructor() {
    super('Employee not found')
  }
}

export class RestaurantNameRequiredError extends AppError {
  constructor() {
    super('Restaurant name is required')
  }
}

export class RestaurantAddressRequiredError extends AppError {
  constructor() {
    super('Restaurant address is required')
  }
}

export class RestaurantEmailRequiredError extends AppError {
  constructor() {
    super('Restaurant email is required')
  }
}

export class RestaurantNotFoundError extends AppError {
  constructor() {
    super('Restaurant not found')
  }
}

export class InvalidPhoneError extends AppError {
  constructor() {
    super('Invalid phone format')
  }
}

export class OwnerFirstNameRequiredError extends AppError {
  constructor() {
    super('Owner first name is required')
  }
}

export class OwnerLastNameRequiredError extends AppError {
  constructor() {
    super('Owner last name is required')
  }
}

export class IngredientNameRequiredError extends AppError {
  constructor() {
    super('Ingredient name is required')
  }
}

export class IngredientNotFoundError extends AppError {
  constructor() {
    super('Ingredient not found')
  }
}

export class InvalidUnitError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid unit')
  }
}

export class NegativeStockError extends AppError {
  constructor() {
    super('Stock cannot be negative')
  }
}

export class RestaurantIdRequiredError extends AppError {
  constructor() {
    super('Restaurant ID is required')
  }
}

export class DishNameRequiredError extends AppError {
  constructor() {
    super('Dish name is required')
  }
}

export class InvalidPriceError extends AppError {
  constructor() {
    super('Price must be a positive number')
  }
}

export class InvalidCategoryError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid category')
  }
}

export class DishNotFoundError extends AppError {
  constructor() {
    super('Dish not found')
  }
}

export class DatabaseNotInitializedError extends AppError {
  constructor() {
    super('Database is not initialized. Call dbConfig.initialize() first.')
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid order status')
  }
}

export class OrderNotFoundError extends AppError {
  constructor() {
    super('Order not found')
  }
}


export class InvalidTableError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Datos de mesa inválidos')
  }
}

export class TableNotFoundError extends AppError {
  constructor() {
    super('Mesa no encontrada')
  }
}

export class DuplicatedTableNumberError extends AppError {
  constructor(number: number) {
    super(`Ya existe una mesa con el número ${number} en este restaurante`)
  }
}

export type TableInUseReason = 'ocupada' | 'reservada' | 'pedidos_pendientes'

export class TableInUseError extends AppError {
  public readonly details: { reason: TableInUseReason, pendingItems: number }

  constructor(reason: TableInUseReason, pendingItems: number) {
    super(
      reason === 'pedidos_pendientes'
        ? `La mesa tiene ${pendingItems} ${pendingItems === 1 ? 'línea' : 'líneas'} de pedido sin entregar`
        : `No se puede continuar: la mesa está ${reason}`
    )
    this.details = { reason, pendingItems }
  }
}

export class TableNotAvailableError extends AppError {
  constructor() {
    super('La mesa ya no está disponible')
  }
}

export class ClientAlreadySeatedError extends AppError {
  public readonly details: { tableId: string }

  constructor(tableNumber: number, tableId: string) {
    super(`Ya tienes la mesa ${tableNumber} ocupada`)
    this.details = { tableId }
  }
}

export class InvalidPartySizeError extends AppError {
  constructor(message?: string) {
    super(message ?? 'El número de personas debe ser un entero mayor o igual que 1')
  }
}

export class TableNotOccupiedError extends AppError {
  constructor() {
    super('La mesa no está ocupada')
  }
}

export class TableNotOccupiedByClientError extends AppError {
  constructor() {
    super('La mesa no está ocupada por este cliente')
  }
}

export class NotTableOwnerError extends AppError {
  constructor() {
    super('Only the client occupying the table can release it')
  }
}
