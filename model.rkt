#lang racket
(require (planet jaymccarthy/mongodb))

(define-mongo-struct task "task"
  ((username #:required)
   (bugnumber)
   (category)
   (comment)
   (_id)
   (in-progress)
   (verified)
   (starttime #:required)
   (endtime)))

(define-mongo-struct paused "paused"
  ((username #:required)
   (starttime #:required)
   (beginpause #:required)
   (endpause)))

(define-mongo-struct
  user "user"
  ((username #:required)
   (cookieid)
   (reportsto)
   (password)))

(provide (all-defined-out))
