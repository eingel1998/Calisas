import { obtener_informes_db } from '../../../utils/db'

export default defineEventHandler(event => obtener_informes_db(getRouterParam(event, 'id') || ''))
