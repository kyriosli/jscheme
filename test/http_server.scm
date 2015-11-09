(define log (. global "console" "log"))

(define require (. global "process" "mainModule" "require"))

(define server (
  (. (require "http") "createServer")
  (method (lambda (req res)
    (log (. req "method") (. req "url") (. req "headers" "user-agent"))
    (invoke res (. res "end") "Hello world")
  ))
))

(invoke server (. server "listen") 8080 (method (lambda ()
  (log "server started at" (invoke this (. this "address")))
)))

undefined