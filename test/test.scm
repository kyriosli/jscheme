; this is a comment
; supported methods
; + - eq?

; supported macros
; define set! lambda if trace

; supported literals
; 1 1.0 1e3 "foo"


(define a undefined)
(define b undefined)

(set! a (lambda (x)
    (if (eq? x 0) "even" (b (- x 1)))
  )
)

(set! b (lambda (x)
    (if (eq? x 0) "odd" (a (- x 1)))
  )
)

(if (not (eq? (a 100000) "even")) (trace "failed"))
(if (not (eq? (a 100001) "odd" )) (trace "failed"))

(if (if 1 1 1) (if 1 0 0) (if 1 1 0))

(if (not (eq? (+ 3 (if 1 4 5)) 7)) (trace "wrong"))

(define ch (. global "String" "fromCharCode"))

(define add
  (lambda (i current)
    (if (eq? i 91)
      current
      (add (+ i 1) (+ current (ch i)))
    )
  )
)

; test set! outer variable

((lambda (x) (set! b x)) 1234)

(if (not (eq? b 1234)) (trace "failed"))

(set! (ref global "abc") 12345)

(if (not (eq? (. global "abc") 12345)) (trace "failed"))

(ref a b)

(trace (ref "x" b))

(add 65 "")