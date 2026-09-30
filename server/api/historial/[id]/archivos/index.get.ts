import { listar_archivos_db } from '../../../../utils/db'

export default defineEventHandler(event => listar_archivos_db(getRouterParam(event, 'id') || ''))
