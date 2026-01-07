import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = 'public'
const DEFAULT_FILE = 'index.html'

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

const server = createServer(async (req, res) => {
    if (!req.url) {
        res.writeHead(400)
        res.end('Bad Request')
        return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Allow': 'GET, HEAD' })
        res.end('Method Not Allowed')
        return
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const normalizedPath = path.normalize(decodeURIComponent(url.pathname))
        const relativePath = normalizedPath === '/' ? DEFAULT_FILE : normalizedPath.replace(/^\//, '')
        let filePath = path.join(ROOT_DIR, relativePath)

        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403)
            res.end('Forbidden')
            return
        }

        let fileStats
        try {
            fileStats = await stat(filePath)
        } catch (error) {
            if (relativePath !== DEFAULT_FILE) {
                res.writeHead(404)
                res.end('Not Found')
                return
            }
            throw error
        }

        if (fileStats.isDirectory()) {
            filePath = path.join(filePath, DEFAULT_FILE)
            fileStats = await stat(filePath)
        }

        const ext = path.extname(filePath).toLowerCase()
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': fileStats.size })

        if (req.method === 'HEAD') {
            res.end()
            return
        }

        createReadStream(filePath).pipe(res)
    } catch (error) {
        console.error('[server] error handling request', error)
        res.writeHead(500)
        res.end('Internal Server Error')
    }
})

const PORT = Number(process.env.PORT ?? 3000)
server.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`)
})
