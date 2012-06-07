#lang racket

(require web-server/servlet
         web-server/http
         web-server/http/cookie
         web-server/http/cookie-parse
         web-server/formlets
         web-server/templates
         web-server/http/redirect
         web-server/http/bindings
         racket/list
         racket/date
         file/md5
         xml
         "model.rkt"
         web-server/servlet-env)
(require (planet "main.rkt" ("jaymccarthy" "mongodb.plt" 1 12)))
(require (planet "main.ss" ("dherman" "json.plt" 3 0)))

(define m (create-mongo))
(define d (make-mongo-db m "tasktimer"))
(current-mongo-db d)

(define doctor-category
  (lambda (t)
    (if (string? (mongo-dict-ref t 'category))
        (mongo-dict-ref t 'category)
        "")))

(define doctor-comment
  (lambda (t)
    (if (string? (mongo-dict-ref t 'comment))
        (mongo-dict-ref t 'comment)
        "")))

(define pause
  (lambda (req)
    (define bindings (request-bindings req))
    (make-paused
     #:username (current-username req)
     #:starttime (extract-binding/single 'starttime bindings)
     #:beginpause (string->number (extract-binding/single 'begin_paused bindings)))
    (response/xexpr
     '(msg "Paused")
     #:mime-type #"application/xml")))

(define unpause
  (lambda (req)
    (define bindings (request-bindings req))
    (define paused-match (mongo-dict-query
                          "paused"
                          (make-hasheq
                           (list (cons 'username (current-username req))
                                 (cons 'beginpause (string->number (extract-binding/single 'begin_paused bindings)))
                                 (cons 'starttime (extract-binding/single 'starttime bindings))))))
    (for/list ((p paused-match))
      (set-paused-endpause! p (round (current-inexact-milliseconds))))
    (response/xexpr
     '(msg "Unpaused")
     #:mime-type #"application/xml")))

(define get-paused-time
  (lambda (req)
    (define bindings (request-bindings req))
    (define total-time 0)
    (define paused-match (mongo-dict-query
                          "paused"
                          (make-hasheq
                           (list (cons 'username (current-username req))
                                 (cons 'starttime (extract-binding/single 'starttime bindings))))))
    (for/list ((p paused-match))
      (cond
        ((bson-null? (mongo-dict-ref p 'endpause)) '())
        (else
         (set! total-time (+ total-time (- 
                                         (mongo-dict-ref p 'endpause)
                                         (mongo-dict-ref p 'beginpause)))))))
    (response/xexpr
     `(paused_time
       ,(number->string total-time)))))

(define timer-page
  (lambda (req)
    (define task-match (mongo-dict-query
                        "task"
                        (make-hasheq
                         (list (cons 'username (current-username req))
                               (cons 'in-progress 1)))))
    (define cookies (request-cookies req))
    (date-display-format 'iso-8601)
    (define id-cookie
      (findf (lambda (c)
               (string=? "id" (client-cookie-name c)))
             cookies))
    (if id-cookie
        (let ((username (current-username req)))
          (if (string=? username "baduser")
              (redirect-to "/?msg=baduser")
              '())
          (response/xexpr
           `(html
             (head
              (title ,(string-append "Task Timer - " username))
              (link ((type "text/css")(rel "stylesheet")(href "fonts-min.css"))" ")
              (link ((type "text/css")(rel "stylesheet")(href "tasktimer.css")) " ")
              (link ((href "http://fonts.googleapis.com/css?family=Geostar+Fill") (rel "stylesheet") (type "text/css"))" ")
              (script ((type "text/javascript")(src "tasktimer.js")) " ")
              (script ((src "yui-min.js")(charset "utf-8"))" ")
              (script ((type "text/javascript")(src "jquery-1.7.1.min.js")) " "))
             
             (body ((link "#000000")(alink "#000000")(vlink "#000000")
                                    (class "yui3-skin-sam yui-skin-sam")
                                    (bgcolor "#228B22"))
                   (table ((style "margin-left:auto;margin-right:auto;"))
                          (tr
                           (td
                            (div ((class "header"))
                                 (table
                                  (tr
                                   (td (img ((src "tasktimer.png")(width "128")(height "128"))))
                                   (td
                                    (h1 ((id "title"))"Task Timer"))
                                   (td ((style "width:300px;text-align:right;vertical-align:bottom;"))
                                       (a ((href "#")(onclick "logout();")) "Logout")))))))
                          (tr
                           (td
                            (div ((id "timertab")(style "min-width:600px;"))
                                 (ul
                                  (li
                                   (a ((href "#tasks-list")) "Create Tasks"))
                                  (li
                                   (a ((href "#cal")) "Calendar"))
                                  (li
                                   (a ((href "#datatable")) "Data")))
                                 (div
                                  (div ((id "tasks-list")(style "min-height:430px;padding: 5px"))
                                       (a ((href "#")(onclick "add_task()")) "Add Task")
                                       (table ((id "tasks-table"))
                                              (tr
                                               (th)
                                               (th ((style "min-width:100px")) "Category")
                                               (th "Notes")
                                               (th ((colspan "2")(style "min-width:150px")) "")
                                               (th)
                                               )
                                              ,@(for/list ((t task-match))
                                                  `(tr ((id ,(string-append "task_" (mongo-dict-ref t 'starttime))))
                                                       (td
                                                        (img (
                                                              (src "pause.png")
                                                              (height "9")
                                                              (style "display:inline;width:25px;height:25px;vertical-align:text-bottom;")
                                                              (id ,(string-append "pause_" (mongo-dict-ref t 'starttime)))
                                                              (onclick ,(string-append "pause(" (mongo-dict-ref t 'starttime) ")"))) " ")
                                                        (img (
                                                              (src "play.png")
                                                              (style "display:none;width:25px;height:25px;vertical-align:text-bottom;")
                                                              (id ,(string-append "unpause_" (mongo-dict-ref t 'starttime)))
                                                              (onclick ,(string-append "unpause(" (mongo-dict-ref t 'starttime) ")" ))) " "))
                                                       (td
                                                        (input 
                                                         ((id ,(string-append "starttime_" (mongo-dict-ref t 'starttime)))
                                                          (value ,(mongo-dict-ref t 'starttime))
                                                          (type "hidden")))
                                                        (input ((type "text")
                                                                (id ,(string-append "auto_cat" (mongo-dict-ref t 'starttime)))
                                                                (onchange ,(string-append "update_cat(" (mongo-dict-ref t 'starttime) ")"))
                                                                (value ,(doctor-category t))
                                                                )))
                                                       (input ((type "hidden")
                                                               (id ,(string-append "comment_" (mongo-dict-ref t 'starttime)))
                                                               (onchange ,(string-append "update_notes(" (mongo-dict-ref t 'starttime) ")"))
                                                               (value ,(doctor-comment t))))
                                                       (td ((style "text-align:center;"))
                                                           (img ((src "Add_text_icon.png")
                                                                 (title ,(doctor-comment t))
                                                                 (id ,(string-append "comment_img_" (mongo-dict-ref t 'starttime)))
                                                                 (onclick ,(string-append "show_dialog(" (mongo-dict-ref t 'starttime) ");")))))
                                                       (td ((colspan "2"))
                                                           (button ((onclick ,(string-append 
                                                                               "cancel_task(" (mongo-dict-ref t 'starttime) ")"))) "CANCEL")
                                                           (button (
                                                                    (id ,(string-append "end_" (mongo-dict-ref t 'starttime)))
                                                                    (onclick ,(string-append "end_task(" (mongo-dict-ref t 'starttime) ")"))) "END")
                                                           
                                                           (td (div ((style "font-weight:bold")(id ,(string-append "timer_" (mongo-dict-ref t 'starttime)))) " ")))
                                                       (script ((type "text/javascript"))
                                                               ,(string-append "start_timer(" (mongo-dict-ref t 'starttime) ");"))))))
                                  (div ((style "min-height:430px")(id "cal"))"")
                                  (div ((style "min-height:430px")(id "datatable"))
                                       (div ((id "pg")) " ")
                                       (div ((id "all-tasks"))))
                                  )))))
                   (script ((type "text/javascript")) "init();")))))
        (redirect-to "/?msg=baduser"))))

(define get-msg
  (lambda (request)
    (define bindings-lst (extract-bindings 'msg (request-bindings request)))
    (cond ((empty? bindings-lst) " ")
          ((null? bindings-lst) " ")
          (else (car bindings-lst)))))

(define get-cookieid
  (lambda (username)
    (let ((cookieid (for/last ([u (mongo-dict-query "user" (hasheq))]
                               #:when (string=? username (user-username u)))
                      (user-cookieid u))))
      (if cookieid cookieid ""))))

(define current-user?
  (lambda (username password)
    (define current? #f)
    (for/list ((u (mongo-dict-query "user" (hasheq))))
      (cond
        ((and (string=? username (user-username u))
              (bytes=? (md5 password)(user-password u)))
         (set! current? #t))
        (else '())))
    current?))

(define new-user?
  (lambda (username)
    (define new? #t)
    (for/list ((u (mongo-dict-query "user" (hasheq))))
      (cond
        ((string=? username (user-username u))
         (set! new? #f))
        (else '())))
    new?))

(define insert-new-user
  (lambda (username password)
    (cond 
      ((new-user? username)
       (make-user #:username username
                  #:password (md5 password))
       #t)
      (else
       #f))))

(define user-formlet
  (formlet
   (table
    (tr (td "Username:")
        (td ,{input-string . => . username}))
    (tr (td "Password:")
        (td ,{(to-string (required (password-input))) . => . password})))
   (list username password)))

(define new-user-formlet
  (formlet
   (table
    (tr (td "Username:")
        (td ,{input-string . => . username}))
    (tr (td "Password:")
        (td ,{(to-string (required (password-input))) . => . new_password1}))
    (tr (td "Confirm:")
        (td ,{(to-string (required (password-input))) . => . new_password2})))
   (list username new_password1 new_password2)))

(define current-username
  (lambda (req)
    (let* ((cookies (request-cookies req))
           (the-cookie (findf (lambda (c)
                                (string=? "id" (client-cookie-name c)))
                              cookies))
           (username (car (regexp-split #rx"-" (client-cookie-value the-cookie)))))
      (if (and the-cookie (string=? 
                           (string-append username "-" (get-cookieid username))
                           (client-cookie-value the-cookie)))
          username
          "baduser"))))

(define calculate-hours
  (lambda (starttime endtime username)
    (let ((total-seconds (- endtime starttime))
          (paused-match (mongo-dict-query 
                         "paused"
                         (make-hasheq
                          (list (cons 'username username)
                                (cons 'starttime starttime))))))
      (for/list ((p paused-match) #:when (mongo-dict-ref p 'endpause))
        (set! total-seconds 
              (- total-seconds 
                 (- endtime starttime))))
      (real->decimal-string (/ (/ (/ total-seconds 1000) 60) 60)))))


(define get-tasks-with-date
  (lambda (req)
    (let* (( bindings (request-bindings req))
           (month (extract-binding/single 'month bindings))
           (day (extract-binding/single 'day bindings))
           (year (extract-binding/single 'year bindings))
           (start-of-day (* 1000(find-seconds 0 0 0 
                                              (string->number day)
                                              (string->number month)(string->number year))))
           (end-of-day (* 1000 (find-seconds 59 59 23 (string->number day)
                                             (string->number month)(string->number year))))
           (task-match (mongo-dict-query
                        "task"
                        (make-hasheq
                         (list (cons 'username (current-username req)))))))
      (response/xexpr
       `(tasks
         ,@(for/list ((t (mongo-dict-query "task" (hasheq))))
             (if (and 
                  (string? (task-starttime t))
                  (string? (task-endtime t))
                  (> (string->number (task-starttime t)) start-of-day)
                  (< (floor (string->number (task-endtime t))) end-of-day))
                 `(task
                   (hours ,(calculate-hours (string->number (mongo-dict-ref t 'starttime))
                                            (string->number (mongo-dict-ref t 'endtime))
                                            (current-username req)))
                   (endtime ,(mongo-dict-ref t 'endtime))
                   (enddate ,(mongo-dict-ref t 'endtime))
                   (starttime ,(mongo-dict-ref t 'starttime))
                   (comment ,(mongo-dict-ref t 'comment))
                   (category ,(mongo-dict-ref t 'category)))
                 '()
                 )
             );for/list
         ) ;tasks
       #:mime-type #"application/xml"))))

(define get-tasks
  (lambda (req)
    (let* ((task-match 
            (sort
             (sequence->list
              (mongo-dict-query
               "task"
               (make-hasheq
                (list (cons 'username (current-username req))))))
             (lambda (x y) 
               (if (and (string? (mongo-dict-ref y 'endtime))(string? (mongo-dict-ref x 'endtime)))
                   (>  (string->number (mongo-dict-ref x 'endtime))
                       (string->number (mongo-dict-ref y 'endtime)))
                   #f)))))
      (response/xexpr
       `(tasks
         ,@(for/list ((t task-match) #:when (string? (mongo-dict-ref t 'endtime)))
             (let* ((enddate (seconds->date (round (/ (string->number (mongo-dict-ref t 'endtime)) 1000)))))
               `(task
                 (hours ,(calculate-hours (string->number (mongo-dict-ref t 'starttime))
                                          (string->number (mongo-dict-ref t 'endtime))
                                          (current-username req)))
                 (endtime ,(mongo-dict-ref t 'endtime))
                 (enddate ,(mongo-dict-ref t 'endtime))
                 (starttime ,(mongo-dict-ref t 'starttime))
                 (comment ,(mongo-dict-ref t 'comment))
		 (_id ,(bson-objectid->string (mongo-dict-ref t '_id)))
                 (category ,(mongo-dict-ref t 'category))))))
       #:mime-type #"application/xml"))))

(define remove-doc
  (lambda (req)
    (define bindings (request-bindings req))
    (define starttime (extract-binding/single 'starttime bindings))
    (mongo-collection-remove!
     (mongo-collection (current-mongo-db) "task")
     (make-hasheq
      (list (cons 'starttime starttime))))
    (mongo-collection-remove!
     (mongo-collection (current-mongo-db) "paused")
     (make-hasheq
      (list (cons 'starttime starttime))))
    (response/xexpr
     '(msg "Deleted")
     #:mime-type #"application/xml")))

(define update-category
  (lambda (req)
    (let*
        ((bindings (request-bindings req))
         (starttime (extract-binding/single 'starttime bindings))
         (category (extract-binding/single 'category bindings))
         
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (for/list ((t (mongo-dict-query "task" (hasheq))))
        (if (equal? (task-starttime t) starttime)
            (set-task-category! t category)
            '())))
    (response/xexpr
     '(msg "Category Updated")
     #:mime-type #"application/xml")))

(define update-endtime
  (lambda (req)
    (let*
        ((bindings (request-bindings req))
         (starttime (extract-binding/single 'starttime bindings))
         (hours (extract-binding/single 'hours bindings))
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (for/list ((t (mongo-dict-query "task" (hasheq))))
        (if (equal? (task-starttime t) starttime)
            (set-task-endtime! t 
                               (number->string 
                                (+ (* (string->number hours) 3600000) 
                                   (string->number starttime))))
            '())))
    (response/xexpr
     '(msg "EndTime Updated")
     #:mime-type #"application/xml")))

(define update-comment
  (lambda (req)
    (let*
        ((bindings (request-bindings req))
         (starttime (extract-binding/single 'starttime bindings))
         (comment (extract-binding/single 'comment bindings))
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (for/list ((t (mongo-dict-query "task" (hasheq))))
        (if (equal? (task-starttime t) starttime)
            (set-task-comment! t comment)
            '()
            )))
    (response/xexpr
     '(msg "Notes Updated")
     #:mime-type #"application/xml")))

(define create-task
  (lambda (req)
    (define bindings (request-bindings req))
    (let*
        ((starttime (extract-binding/single 'starttime bindings))
         (username (current-username req)))
      (make-task #:username username
                 #:in-progress 1
                 #:starttime starttime))
    (response/xexpr
     '(msg "Task created")
     #:mime-type #"application/xml")))

(define validate-user
  (lambda (req)
    (cond
      ((current-user? (car (formlet-process user-formlet req))
                      (second
                       (formlet-process user-formlet req)))
       (let* ((username (car (formlet-process user-formlet req)))
              (cookieid (number->string (random 4294967087)))
              (id-cookie (make-cookie "id" (string-append  username "-" cookieid) #:secure? #t)))
         (for/list ((u (mongo-dict-query "user" (hasheq))))
           (cond
             ((string=? username (user-username u))
              (set-user-cookieid! u cookieid))
             (else
              '())))
         (redirect-to "timer" #:headers (list (cookie->header id-cookie)))))
      (else
       (redirect-to "/?msg=baduser")))))

(define validate-new-user
  (lambda (req)
    (let ((data-list (formlet-process new-user-formlet req)))
      (cond
        ((string=? (second data-list)(third data-list))
         (cond
           ((insert-new-user (car data-list) (second data-list))
            (define id-cookie (make-cookie "id" (car data-list) #:secure? #t))
            (redirect-to "timer" #:headers (list (cookie->header id-cookie))))
           (else
            (redirect-to "/?msg=notnew"))))
        (else
         (redirect-to "/?msg=nomatch"))))))

(define logon-page
  (lambda (req)
    (define msg (get-msg req))
    (define cookies (request-cookies req))
    (define id-cookie
      (findf (lambda (c)
               (string=? "id" (client-cookie-name c)))
             cookies))
    (if id-cookie 
        (redirect-to "/timer") 
        (begin
          (response/xexpr
           `(html
             (head (title "Task Timer")
                   (script ((type "text/javascript")(src "jquery-1.7.1.min.js")) " ")
                   (link ((href "http://fonts.googleapis.com/css?family=Geostar+Fill") (rel "stylesheet") (type "text/css"))" ")
                   (link ((type "text/css")(rel "stylesheet")(href "tasktimer.css")) " ")
                   (script ((type "text/javascript")(src "tasktimer.js"))" "))
             (body ((link "#000000")(bgcolor "#228B22"))
                   (div ((id "center_content"))
                        (div ((class "header"))
                             (table
                              (tr
                               (td
                                (img ((src "tasktimer.png")
                                      (width "128")(height "128"))))
                               (td
                                (h1 "Task Timer")))))
                        (div ((style "border:1px solid black;background:#99CCFF;padding-top:5px;padding-left:5px;"))
                             (div ((id "message_div") (style "color:red;")) 
                                  ,(cond
                                     ((string=? msg "notnew")
                                      "Please choose another user name.")
                                     ((string=? msg "nomatch")
                                      "Your passwords did not match.")
                                     ((string=? msg "baduser")
                                      "Login failed.")
                                     (else
                                      " ")))
                             (form ((id "logon_form")
                                    (action "validate-user")
                                    (onsubmit "return check_login();"))
                                   ,@(formlet-display user-formlet)
                                   (br)
                                   (input ((type "submit")(name "login")(value "Login")))))
                        (div ((style "border:1px solid black;background:#99CCFF;padding-top:5px;padding-left:5px;"))
                             (form ((id "create_logon_form") 
                                    (action "validate-new-user")
                                    (onsubmit "return cmp_passwords();"))
                                   ,@(formlet-display new-user-formlet)
                                   (br)
                                   (input ((type "submit")(name "login")(value "Create Account")))))))))))))

(define save-task
  (lambda (req)
    (define bindings (request-bindings req))
    (let*
        ((comment (extract-binding/single 'comment bindings))
         (endtime (extract-binding/single 'endtime bindings))
         (category (extract-binding/single 'category bindings))
         (starttime (extract-binding/single 'starttime bindings))
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (for/list ((t (mongo-dict-query "task" (hasheq))))
	(if (equal? (task-starttime t) starttime)
            (begin
              (set-task-endtime! t endtime)
              (set-task-category! t category)
              (set-task-comment! t comment)
              (set-task-in-progress! t 0)
              (set-task-username! t (current-username req)))
            '())))
    (response/xexpr
     '(msg "Task saved."))))

(define save-new-task
  (lambda (req)
    (define bindings (request-bindings req))
    (let*
        ((comment (extract-binding/single 'comment bindings))
         (endtime (extract-binding/single 'endtime bindings))
         (category (extract-binding/single 'category bindings))
         (starttime (extract-binding/single 'starttime bindings))
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (for/list ((t (mongo-dict-query "task" (hasheq))))
	(if (equal? (task-starttime t) starttime)
            (begin
              (set-task-endtime! t endtime)
              (set-task-category! t category)
              (set-task-comment! t comment)
              (set-task-in-progress! t 0)
              (set-task-username! t (current-username req)))
            '())))
    (response/xexpr
     '(msg "Task saved."))))

(define (start request)
  (tasktimer-dispatch request))

(define-values (tasktimer-dispatch tasktimer-url)
  (dispatch-rules
   (("") logon-page)
   (("save-task") save-task)
   (("create-task") create-task)
   (("get-tasks") get-tasks)
   (("get-tasks-with-date") get-tasks-with-date)
   (("get-paused-time") get-paused-time)
   (("validate-new-user") validate-new-user)
   (("validate-user") validate-user)
   (("update-category") update-category)
   (("update-comment") update-comment)
   (("update-endtime") update-endtime)
   (("remove-doc") remove-doc)
   (("pause") pause)
   (("unpause") unpause)
   (("timer") timer-page)))

(serve/servlet start
               #:launch-browser? #f
               #:quit? #f
               #:ssl? #t
               #:listen-ip #f
               #:port 8081
               #:ssl-cert (build-path "." "server-cert.pem")
               #:ssl-key (build-path "." "private-key.pem")
               #:servlet-regexp #rx""
               #:extra-files-paths (list 
                                    (build-path "./htdocs"))
               #:servlet-path "/main.rkt")
