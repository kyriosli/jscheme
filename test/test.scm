; this is a comment
; supported methods
; + - eq?

; supported macros
; define set! lambda if trace

; supported literals
; 1 1.0 1e3 "foo"


(define op "add")

((if (eq? op "add") + -) 4 3)