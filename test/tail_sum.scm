; 尾递归测试
(define sum (lambda (x n)
  (if (eq? x 0)
    n
    (sum (- x 1) (+ x n))
  )
))

(sum 5e5 0)