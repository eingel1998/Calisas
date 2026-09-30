import { listar_drx_graficas_db } from '../../../../../utils/db'

export default defineEventHandler(event => listar_drx_graficas_db(getRouterParam(event, 'id') || ''))
