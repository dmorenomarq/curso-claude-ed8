import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, restrictToOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(
    new SqliteTableRepository(dbConfig),
    new SqliteOrderRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const STAFF = ['admin', 'manager', 'camarero', 'cocinero']
const MANAGEMENT = ['admin', 'manager']
const FLOOR_STAFF = ['admin', 'manager', 'camarero']

router.use(authenticate, restrictToOwnRestaurant)

router.get('/', authorize(STAFF), tableController.getAll)
router.post('/', authorize(MANAGEMENT), tableController.create)

// /available y /mine deben ir antes de /:id para que no se interpreten como un id
router.get('/available', tableController.getAvailable)
router.get('/mine', authorize(['cliente']), tableController.getMine)

router.get('/:id', authorize(STAFF), tableController.getById)
router.put('/:id', authorize(MANAGEMENT), tableController.update)
router.delete('/:id', authorize(MANAGEMENT), tableController.delete)
router.patch('/:id/status', authorize(FLOOR_STAFF), tableController.updateStatus)
router.post('/:id/occupy', authorize([...FLOOR_STAFF, 'cliente']), tableController.occupy)
router.post('/:id/release', authorize([...FLOOR_STAFF, 'cliente']), tableController.release)
router.get('/:id/orders', authorize(STAFF), tableController.listOrders)

export default router
