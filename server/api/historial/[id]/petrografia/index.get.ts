import { obtener_petrografia_db } from '../../../../utils/db'
export default defineEventHandler((event) => obtener_petrografia_db(getRouterParam(event, 'id') || ''))
