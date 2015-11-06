(define fib
  (lambda (x)
    (define tmp (lambda (x a b)
      (if (< x 2) b
        (tmp (- x 1) b (+ a b))
      )
    ))
    (tmp x 1 1)
  )
)

(fib 1000)