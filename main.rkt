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
         net/url
         net/base64
         net/uri-codec
         xml
         file/md5
         file/convertible
         srfi/13
         plot
         "model.rkt"
         web-server/servlet-env)
(require web-server/configuration/responders)
(require (planet "main.rkt" ("jaymccarthy" "mongodb.plt" 1 12)))
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

(define (boolean->xexpr b)
  (if b "T" "F"))

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

(define get-all-users
  (lambda (req)
    (define user-match (mongo-dict-query
                        "user"
                        (hasheq)
                        ))
    (response/xexpr
     `(users
       ,@(for/list ((u user-match))
           `(user
             ,(mongo-dict-ref u 'username)))))))

(define pro?
  (lambda (username)
    (define user-match (mongo-dict-query
                        "user"
                        (make-hasheq
                         (list (cons 'username username)))))
    (define my-user (sequence-ref user-match 0))
    (cond
      ((bson-null? (mongo-dict-ref  my-user 'pro)) #f)
      (else
       (mongo-dict-ref my-user 'pro))
      )))

(define reportsto-verified?
  (lambda (username)
    (define user-match (mongo-dict-query
                        "user"
                        (make-hasheq
                         (list (cons 'username username)))))
    (define my-user (sequence-ref user-match 0))
    (cond
      ((bson-null? (mongo-dict-ref  my-user 'reportsto-verified)) #f)
      (else
       (and 
	(not (bson-null? 
	       (mongo-dict-ref my-user 'reportsto)))
	(not (mongo-dict-ref my-user 'reportsto-verified))
	)))))

(define get-paused-time
  (lambda (req)
    (define bindings (request-bindings req))
    (define total-time 0)
    (define paused-match (mongo-dict-query
                          "paused"
                          (make-hasheq
                           (list (cons 'username (current-username req))
                                 (cons 'starttime (extract-binding/single 
                                                   'starttime bindings))))))
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

(define tasks-page
  (lambda (req)
    (define bindings (request-bindings req))
    (define task-match (mongo-dict-query
                        "task"
                        (make-hasheq
                         (list (cons 'username (current-username req))
                               (cons 'in-progress #t)))))
    (response/xexpr
     `(div ((id "tasks-list")(class "tasks-list")(style "min-height:430px;padding: 5px"))
           (a ((href "#")(onclick "add_task()")) "Add Task")
           (table ((id "tasks-table"))
                  (tr
                   (th)
                   (th ((style "min-width:100px")) "Category")
                   (th "Notes")
                   (th ((colspan "2")(style "min-width:150px")) "")
                   (th " "))
                  ,@(for/list ((t task-match))
                      `(tr ((id ,(string-append "task_" (mongo-dict-ref t 'starttime))))
                           (td
                            (img ((src "pause.png")
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
                            (input 
                             ((id ,(string-append "bsonid_" (mongo-dict-ref t 'starttime)))
                              (value ,(bson-objectid->string (mongo-dict-ref t '_id)))
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
                                   ,(string-append "start_timer(" (mongo-dict-ref t 'starttime) ");")))))))))

(define graphs
  (lambda (req)
    (response/xexpr
     '(p ((style "text-align:center;"))
         (img ((src "graph-tasks")))))))

(define pro-page
  (lambda (req)
    (define user-match
      (mongo-dict-query
       "user"
       (make-hasheq
        (list (cons 'reportsto (current-username req))))))
    (response/xexpr
     `(div
       ,(if (pro? (current-username req))
            `(div ((style "text-align:center;")(id "employees_group"))
                  (p "You can enter the usernames of your employees here.")

		  (div ((class "ui-widget")(style "display:none")(id "pro-msg"))
		       (div ((class "ui-state-error ui-corner-all")) 
				(table
				 (tr
				  (td (span ((class "ui-icon ui-icon-alert"))))
				  (td (strong "Alert:"))
				  (td (div ((id "employees-msg-div"))"You should not see this."))))))

                  (p (button ((type "button")(onclick "add_user();")) "Add User"))
                  (p
                   ,@(for/list ((u user-match))
                       `(p 
                         (input 
                          ((type "text")
                           (name "username")
                           (value ,(mongo-dict-ref u 'username))))))))
            '(p "Please contact us at sales AT tommywindich DOT com."))))))

(define timer-page
  (lambda (req)
    (define bindings (request-bindings req))
    (define task-match (mongo-dict-query
                        "task"
                        (make-hasheq
                         (list (cons 'username (current-username req))
                               (cons 'in-progress #t)))))
    (define cookies (request-cookies req))
    (date-display-format 'iso-8601)
    (define id-cookie
      (findf (lambda (c)
               (string=? "id" (client-cookie-name c)))
             cookies))
    (define verify-string
      (cond
       ((reportsto-verified? (current-username req)) "verify = false;")
       (else
	"verify = true;")))
    (if id-cookie
        (let ((username (current-username req)))
          (if (string=? username "baduser")
              (redirect-to "/?msg=baduser")
              '())
          (response/xexpr
           `(html
             (head
              (title ,(string-append "Tommy Windich - " username))
              (link ((type "text/css")(rel "stylesheet")(href "fonts-min.css"))" ")
              (link ((rel "stylesheet") (href "development-bundle/themes/mint-choc/jquery.ui.all.css")) " ")
              (script ((type "text/javascript")(src "tasktimer.js")) " ")
              (script ((src "yui/build/yui/yui.js")(charset "utf-8"))" ")
              (script ((src "yui/build/loader/loader.js")(charset "utf-8"))" ")
              (script ((src "development-bundle/jquery-1.7.2.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.core.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.widget.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.tabs.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.mouse.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.button.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.draggable.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.position.js")) " ")
              (script ((src "development-bundle/ui/jquery.ui.dialog.js")) " ")
              (link ((type "text/css")(rel "stylesheet")(href "tasktimer.css")) " ")
              (script ((type "text/javascript"))"$(function(){$('#tabs').tabs();});"))
             
             (body ((link "#000000")(alink "#000000")(vlink "#000000")
                                    (class "yui3-skin-sam yui-skin-sam")
                                    (bgcolor "#228B22"))
		   (div ((style "display:none")(id "dialog-confirm") (title "Confirm"))
			(p
			 (span
			  ((id "message-span")
			   (class "ui-icon ui-icon-alert")
			   (style "float:left; margin:0 7px 20px 0;"))
			  "Message goes here")))

                   (table ((style "margin-left:auto;margin-right:auto;"))
                          (tr
                           (td
                            (div ((class "header"))
                                 (table
                                  (tr
                                   (td (img ((src "tasktimer.png")(width "128")(height "128"))))
                                   (td
                                    (h1 ((id "title") (style "font-family:titan,cursive"))"Tommy Windich"))
                                   (td ((style "width:300px;text-align:right;vertical-align:bottom;"))
                                       (a ((href "#") (id "employees_link") (style "display:none;")) "Employees")
                                       nbsp
                                       (a ((href "#")(onclick "logout();")) "Logout")))))))
                          (tr
                           (td
                            (div ((id "tabs") (style "min-width:600px;"))
                                 (ul
                                  (li (a ((href "tasks-page")) "Create Tasks"))
                                  (li (a ((href "#cal")) "Calendar"))
                                  (li (a ((href "#datatable")) "Data"))
                                  (li (a ((href "graphs")) "Charts"))
                                  (li (a ((href "pro-page")) "Pro"))
                                  )
                                 (div ((style "min-height:430px")(id "cal"))"")
                                 (div ((style "min-height:430px;")(id "datatable"))
                                      (div ((id "pg")) " ")
                                      (div ((id "all-tasks"))))))))
                   (script ((type "text/javascript")) ,(string-append "var verify = false;"
								      verify-string
								      "init(verify);"))
                   ))))
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
  (lambda (username password cookieid)
    (cond 
      ((new-user? username)
       (make-user #:username username
                  #:cookieid cookieid
		  #:reportsto-verified #f
		  #:pro #f
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

(define reportsto-formlet
  (formlet 
   (div
    (p "User 1: " ,{input-string . => . username1})
    (p "User 2: " ,{input-string . => . username2})
    (p "User 3: " ,{input-string . => . username3})
    )
   (list username1 username2 username3)
   ))

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
    (define bindings (request-bindings req))
    (if (exists-binding? 'username bindings)
        (extract-binding/single 'username bindings)
        (let* ((cookies (request-cookies req))
               (the-cookie (findf (lambda (c)
                                    (string=? "id" (client-cookie-name c)))
                                  cookies))
               (username (car (regexp-split #rx"-" (client-cookie-value the-cookie)))))
          (if (and the-cookie (string=? 
                               (string-append username "-" (get-cookieid username))
                               (client-cookie-value the-cookie)))
              username
              "baduser")))))

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

(define hash-to-vectorlist
  (lambda (h)
    (for/list ([(k v) (in-dict h)])
      (vector k v))))

(define get-total-hours
  (lambda (username category)
    (let ((task-match
           (mongo-dict-query
            "task"
            (make-hasheq
             (list (cons 'category category) (cons 'username username)))))
          (total 0))
      (for/list ((t task-match))
        (if (mongo-dict-ref t 'starttime)
        (set! total (/(/(/(+ (- (string->number (mongo-dict-ref t 'endtime))
                                (string->number (mongo-dict-ref t 'starttime))
                                ) total) 1000)60)60))
        (list)
        ))
      total)))

(define get-categories-vector
  (lambda (username)
    (let
        ((task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'username username)))))
         (hash (make-hash '())))
      (for/list ((t task-match))
        (dict-set! hash (mongo-dict-ref t 'category) (get-total-hours username (mongo-dict-ref t 'category))))
      
      hash
      )
    ))

(define get-tasks-with-date
  (lambda (req)
    (let* (( bindings (request-bindings req))
           (month (extract-binding/single 'month bindings))
           (day (extract-binding/single 'day bindings))
           (year (extract-binding/single 'year bindings))
           (start-of-day (* 1000 (find-seconds 0 0 0 
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
         ,@(for/list ((t (mongo-dict-query "task" 
                                           (make-hasheq 
                                            (list (cons 'username (current-username req)))))))
             (if (and 
                  (string? (task-starttime t))
                  (string? (task-endtime t))
                  (>= (string->number (task-starttime t)) start-of-day)
                  (< (floor (string->number (task-endtime t))) end-of-day))
                 `(task
                   (hours ,(calculate-hours (string->number (mongo-dict-ref t 'starttime))
                                            (string->number (mongo-dict-ref t 'endtime))
                                            (current-username req)))
                   (endtime ,(mongo-dict-ref t 'endtime))
                   (enddate ,(mongo-dict-ref t 'endtime))
                   (starttime ,(mongo-dict-ref t 'starttime))
                   (bsonid , (bson-objectid->string(mongo-dict-ref t '_id)))
                   (comment ,(mongo-dict-ref t 'comment))
                   (category ,(mongo-dict-ref t 'category)))
                 '()
                 )
             );for/list
         ) ;tasks
       #:mime-type #"application/xml"))))


(define get-employees
  (lambda (req)
    (define user-match
      (mongo-dict-query
       "user"
       (make-hasheq
        (list (cons 'reportsto (current-username req))))))
    (response/xexpr
     `(employees
       ,@(for/list ((u user-match))
           `(employee
             ((username ,(mongo-dict-ref u 'username)))
             (tasks
              ,@(for/list ((t (mongo-dict-query 
                               "task" 
                               (make-hasheq 
                                (list (cons 'in-progress #f) (cons 'username (mongo-dict-ref u 'username)))))
                              ))
                  `(task
                    (bsonid ,(bson-objectid->string (mongo-dict-ref t '_id)))
                    (endtime ,(mongo-dict-ref t 'endtime))
                    (starttime ,(mongo-dict-ref t 'starttime))
                    (category ,(mongo-dict-ref t 'category))
                    (hours ,(calculate-hours (string->number (mongo-dict-ref t 'starttime))
                                             (string->number (mongo-dict-ref t 'endtime))
                                             (mongo-dict-ref u 'username)))
                    (verified ,(boolean->xexpr (mongo-dict-ref t 'verified)))
                    (comment ,(mongo-dict-ref t 'comment))
                    );task
                  );for/list
              );tasks
             );employee
           );for/list
       );employees
     #:mime-type #"application/xml")
    ))

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
                 (bsonid ,(bson-objectid->string (mongo-dict-ref t '_id)))
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

(define verify-task
  (lambda (req)
    (let*
        ((bindings (request-bindings req))
         (username (extract-binding/single 'username bindings))
         (bsonids  (extract-bindings 'bsonid bindings)))
      (for/list ((t (mongo-dict-query "task" (make-hasheq
                                              (list 
                                               (cons 'username username))))))
        (for/list ((bsonid bsonids))
          (if (string=? (string-trim-both (bson-objectid->string (task-_id t))) 
                        (string-trim-both bsonid))
              (begin
                (display "match!")
                (set-task-verified! t #t))
              (display "no match!")))))
    (response/xexpr
     '(msg "Verified")
     )
    );lambda
  ) ;verify

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
         (bsonid (extract-binding/single 'bsonid bindings))
         (hours (extract-binding/single 'hours bindings))
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons '_id  (string->bson-objectid (string-trim-both bsonid))))))))
      (mongo-dict-set! (sequence-ref task-match 0) 'endtime
                       (number->string
                        (+ (* (string->number hours) 3600000)
                           (string->number starttime)))))
    (response/xexpr
     '(msg "EndTime Updated")
     #:mime-type #"application/xml")))

(define add-reportsto
  (lambda (req)
    (let*
        ((bindings (request-bindings req))
         (employee (extract-binding/single 'employee bindings))
	 (user-obj (sequence-ref (mongo-dict-query "user" (make-hasheq (list (cons 'username employee))))0)))
      (set-user-reportsto! user-obj (current-username req))
      (set-user-reportsto-verified! user-obj #f))
    (response/xexpr
     '(msg "success"))))

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
         (username (current-username req))
         (t (make-task #:username username
                       #:in-progress #t
                       #:starttime starttime)))
      (response/xexpr
       `(task
         (bsonid ,(bson-objectid->string (task-_id t)))
         (msg "Task created"))
       #:mime-type #"application/xml"))))

(define oauth2callback
  (lambda (req)
    (define bindings (request-bindings req))
    (response/xexpr
     `(html
       (head 
        (script ((type "text/javascript")(src "tasktimer.js")) " ")
        (script ((type "text/javascript")(src "jquery-1.7.1.min.js")) " ")
        (script ((src "yui/build/yui/yui.js")(charset "utf-8"))" ")
        (script ((type "text/javascript"))
                "var url = document.URL; expiresIn = gup(url, 'expires_in');tokenType = gup(url, 'token_type');acToken = gup(url, 'access_token');validateToken(acToken);")
        )
       (body ((link "#000000")(bgcolor "#228B22"))
             (div ((id "center_content"))
                  ,(banner)
                  "You should be redirected shortly. If not please click "
                  (a ((href "timer") (id "goto-timer")) "here")
                  "."))))))

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

(define oauth-user
  (lambda (req)
    (define bindings (request-bindings req))
    (define username (extract-binding/single 'username bindings))
    (define user-match (sequence->list (mongo-dict-query 
                                        "user" 
                                        (list (cons 'username 
                                                    (form-urlencoded-decode username))))))
    (define cookieid (number->string (random 4294967087)))
    (if (= (length user-match) 0)
        (make-user #:username username
		   #:reportsto-verified #f
		   #:pro #f
                   #:cookieid cookieid)
        (mongo-dict-set! (car user-match) 'cookieid cookieid))
    (response/xexpr
     `(cookies
       (cookie
        ,cookieid)))))

(define validate-new-user
  (lambda (req)
    (let ((data-list (formlet-process new-user-formlet req))
          (cookieid (number->string (random 4294967087))))
      (cond
        ((< (string-length (second data-list)) 8)
         (redirect-to "/?msg=tooshort"))
        ((string=? (second data-list)(third data-list))
         (cond
           ((insert-new-user (car data-list) (second data-list) cookieid)
            (define id-cookie (make-cookie "id" (string-append (car data-list) "-" cookieid) #:secure? #t))
            (redirect-to "/timer" #:headers (list (cookie->header id-cookie))))
           (else
            (redirect-to "/?msg=notnew"))))
        (else
         (redirect-to "/?msg=nomatch"))))))

(define banner
  (lambda ()
    '(div ((class "header"))
          (table
           (tr
            (td
             (img ((src "tasktimer.png")
                   (width "128")(height "128"))))
            (td
             (h1 ((style "font-family:titan,cursive")) "Tommy Windich"))
            (td ((style "text-align:right;vertical-align:bottom;"))
                (h3 ((style "font-family:dynalight;"))"Time tracking made easy...")))))))

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
           #:preamble #"<!DOCTYPE html>"
           `(html
             (head (title "Tommy Windich")
                   (script ((type "text/javascript")(src "jquery-1.7.1.min.js")) " ")
                   (link ((type "text/css")(rel "stylesheet")(href "tasktimer.css")) " ")
                   (link ((rel "stylesheet")(type "text/css")(href"css/zocial.css" ))" ")
                   (script ((type "text/javascript")(src "tasktimer.js"))" "))
             (body ((link "#000000")(bgcolor "#228B22"))
                   (div ((id "center_content"))
                        ,(banner)
                        (div ((style "border:1px solid black;background:#99CCFF;padding-top:5px;padding-left:5px;"))
                             (div ((id "message_div") (style "color:red;")) 
                                  ,(cond
                                     ((string=? msg "notnew")
                                      "Please choose another user name.")
                                     ((string=? msg "nomatch")
                                      "Your passwords did not match.")
                                     ((string=? msg "tooshort")
                                      "Passwords must be at least 8 characters.")
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
                                   (input ((type "submit")(name "login")(value "Create Account")))))
                        (div ((style "border:1px solid black;background:#99CCFF;padding:5px;"))
                             (table ((cellpadding "0"))
                                    (tr
                                     (td
                                      (a ((href "https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&state=%2Fprofile&redirect_uri=https%3A%2F%2Ftommywindich.com/oauth2callback&response_type=token&client_id=21849082230.apps.googleusercontent.com")(class "zocial google")(style "font-size:13px;")) "Sign in with Google"))
                                     (td ((width "1")(bgcolor "787878"))(br))
                                     (td
                                      (g:plusone ((annotations "inline"))))
                                     );tr
                                    );table
                             );dive
                        ))))))))

(define APPLICATION/JSON-MIME-TYPE
  (string->bytes/utf-8 "application/json; charset=utf-8"))

(define graph-tasks
  (lambda (req)    
    (response/full
     200 
     #"OK"
     (current-seconds)
     #"image/png"
     (list (make-header #"Location"
                        #"https://tommywindich.com/graph-tasks"))
     (list
      (convert
       (plot
        (list
         (discrete-histogram
          (hash-to-vectorlist (get-categories-vector (current-username req)))
          #:label "Hours per category")
         ))
       'png-bytes)))))

(define save-task
  (lambda (req)
    (define bindings (request-bindings req))
    (let*
        ((comment (extract-binding/single 'comment bindings))
         (endtime (extract-binding/single 'endtime bindings))
         (category (extract-binding/single 'category bindings))
         (bsonid (extract-binding/single 'bsonid bindings))
         (starttime (extract-binding/single 'starttime bindings))
         (found-task #f)
         (task-match (mongo-dict-query
                      "task"
                      (make-hasheq
                       (list (cons 'starttime starttime))))))
      (if (exists-binding? 'bsonid bindings) 
          (for/list ((t (mongo-dict-query "task" (hasheq))))
            (if (string=? (string-trim-both (bson-objectid->string (task-_id t))) (string-trim-both bsonid))
                (begin
                  (set! found-task #t)
                  (set-task-starttime! t starttime)
                  (set-task-endtime! t endtime)
                  (set-task-category! t category)
                  (set-task-comment! t comment)
                  (set-task-in-progress! t #f)
                  (set-task-verified! t #f)
                  (set-task-username! t (current-username req)))
                '())
            )
          (make-task #:username (current-username req)
                     #:in-progress #t
                     #:verified 0
                     #:comment comment
                     #:category category
                     #:endtime endtime
                     #:starttime starttime)))
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
   (("get-employees") get-employees)
   (("validate-new-user") validate-new-user)
   (("validate-user") validate-user)
   (("oauth2callback") oauth2callback)
   (("update-category") update-category)
   (("update-comment") update-comment)
   (("verify") verify-task)
   (("update-endtime") update-endtime)
   (("remove-doc") remove-doc)
   (("pause") pause)
   (("graph-tasks") graph-tasks)
   (("graphs") graphs)
   (("unpause") unpause)
   (("oauth-user") oauth-user)
   (("tasks-page") tasks-page)
   (("pro-page") pro-page)
   (("get-all-users") get-all-users)
   (("add-reportsto") add-reportsto)
   (("timer") timer-page)))

(define s1
  (thread
   (lambda ()
     (serve/servlet
      (lambda (req)
        (redirect-to
         (url->string
          (struct-copy url (request-uri req)
                       [scheme "https"]
                       ;[host "tommywindich.com"]
                       [host "localhost"]
                       [port 8081]))))
      #:port 8080
      #:listen-ip #f
      #:quit? #f
      #:ssl? #f
      #:launch-browser? #f
      #:servlet-regexp #rx""))))

(define s2
  (thread
   (lambda ()
     (serve/servlet start
                    #:launch-browser? #t
                    #:quit? #f
                    #:ssl? #t
                    #:listen-ip #f
                    #:port 8081
                    ;#:ssl-cert (build-path "/etc/ssl/localcerts" "combined.crt")
                    #:ssl-cert (build-path "./server-cert.pem")
                    ;#:ssl-key (build-path "/etc/ssl/localcerts" "www.tommywindich.com.key")
                    #:ssl-key (build-path "./private-key.pem")
                    #:servlet-regexp #rx""
                    #:extra-files-paths (list 
                                         (build-path "./htdocs"))
                    #:servlet-path ""))))

(thread-wait s1)
(thread-wait s2)
