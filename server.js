import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'
const publicDir = path.join(__dirname, 'public')

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
}

const send404 = (res) => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
}

const createServer = () => {
    return http.createServer((req, res) => {
        if (!req.url) {
            send404(res)
            return
        }

        const { pathname } = new URL(req.url, `http://${req.headers.host}`)
        const safePath = pathname === '/' ? '/index.html' : pathname
        const normalizedPath = path
            .normalize(safePath)
            .replace(/^[/\\]+/, '')
        const filePath = path.join(publicDir, normalizedPath)

        if (!filePath.startsWith(publicDir)) {
            send404(res)
            return
        }

        fs.stat(filePath, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    send404(res)
                    return
                }
                res.writeHead(500)
                res.end('Internal Server Error')
                return
            }

            const resolvedPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath
            const ext = path.extname(resolvedPath)
            const contentType = mimeTypes[ext] || 'application/octet-stream'

            fs.readFile(resolvedPath, (readErr, data) => {
                if (readErr) {
                    res.writeHead(500)
                    res.end('Internal Server Error')
                    return
                }
                res.writeHead(200, { 'Content-Type': contentType })
                res.end(data)
            })
        })
    })
}

createServer().listen(port, host, () => {
    console.log(`Static server ready at http://${host}:${port}`)
})
