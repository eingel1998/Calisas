import { obtener_analisis_termico_db } from '../../../../utils/db'
export default defineEventHandler((event) => obtener_analisis_termico_db(getRouterParam(event, 'id') || ''))
