; this is a comment
; supported methods
; + - eq?

; supported macros
; define set! lambda if trace

; supported literals
; 1 1.0 1e3 "foo"

(define ch (. global "String" "fromCharCode"))

(define add
  (lambda (i current)
    (if (eq? i 91)
      current
      (add (+ i 1) (+ current (ch i)))
    )
  )
)


(add 65 "")