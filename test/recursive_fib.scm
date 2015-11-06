; 递归测试
(define fib (lambda (x)
  (if (< x 2) 1
    (+
      (fib (- x 1))
      (fib (- x 2))
    )
  )
))

(fib 23)