import { obtener_drx_db } from '../../../../utils/db'
export default defineEventHandler((event) => obtener_drx_db(getRouterParam(event, 'id') || ''))
