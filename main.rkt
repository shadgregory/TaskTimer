#lang racket

(require web-server/servlet
         web-server/http/cookie
         web-server/http/cookie-parse
         web-server/http
         web-server/formlets
	 web-server/templates
         web-server/http/redirect
         web-server/http/bindings
         racket/list
	 racket/date
         file/md5
	 xml
         web-server/servlet-env)
(require (planet "main.rkt" ("jaymccarthy" "mongodb.plt" 1 11)))
(require (planet "main.ss" ("dherman" "json.plt" 3 0)))

(define m (create-mongo))(define d (make-mongo-db m "eggtimer"))
(current-mongo-db d)
(define-mongo-struct task "task"
  ((username #:required)
   (bugnumber)
   (category)
   (comment)
   (starttime #:required)
   (endtime #:required)))

(define-mongo-struct
  user "user"
  ([username #:required]
   [password #:required]))

(define timer-page
  (lambda (req)
    (define cookies (request-cookies req))
    (define id-cookie
      (findf (lambda (c)
               (string=? "id" (client-cookie-name c)))
             cookies))
    (if id-cookie
        (let ((username (client-cookie-value id-cookie)))
	  (response/xexpr
	   `(html
	     (head
	      (title ,(string-append "Task Timer - " username))
	      (link ((type "text/css")(rel "stylesheet")(href "http://yui.yahooapis.com/3.4.1/build/cssfonts/fonts-min.css"))" ")
	      (link ((type "text/css")(rel "stylesheet")(href "eggtimer.css")) " ")
	      (link ((href "http://fonts.googleapis.com/css?family=Geostar+Fill") (rel "stylesheet") (type "text/css"))" ")
	      (script ((type "text/javascript")(src "eggtimer.js")) " ")
	      (script ((src "http://yui.yahooapis.com/3.4.1/build/yui/yui-min.js")(charset "utf-8"))" ")
	      (script ((type "text/javascript")(src "jquery-1.6.4.js")) " "))

	     (body ((class "yui3-skin-sam yui-skin-sam")(bgcolor "#e5e5e5"))
		   (div ((style "align-text:center;margin-left:21%;margin-right:21%;font-family: 'Geostar Fill',cursive;"))
			 (h1 "Task Timer"))
		   (div ((id "timertab")(style "margin-left:21%;margin-right:21%;"))
			(ul
			 (li
			  (a ((href "#tasks-list")) "Create Tasks"))
			 (li
			  (a ((href "#datatable")) "Data"))
			 )
			(div
			 (div ((id "tasks-list")(style "padding: 5px"))
			      (a ((href "#")(onclick "add_task()")) "Add Task")
			      (table ((id "tasks-table"))
				     (tr
				      (th ((style "min-width:100px")) "Bug Number")
				      (th ((style "min-width:100px")) "Category")
				      (th ((style "min-width:100px")) "Notes")
				      (th ((colspan "2")(style "min-width:200px")) ""))))
			      (div ((id "datatable"))
				   (div ((id "all-tasks")))
				   )
			      );div
			);timertab

		   (script ((type "text/javascript")) "init();")
		   );body
	     );html
	   );response
	  );let
	(redirect-to "")
	);if
    );lambda
  );define

(define get-msg
  (lambda (request)
    (define bindings-lst (extract-bindings 'msg (request-bindings request)))
    (cond ((empty? bindings-lst) " ")
          ((null? bindings-lst) " ")
          (else (car bindings-lst)))))

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
    (define cookies (request-cookies req))
    (define id-cookie
      (findf (lambda (c)
	       (string=? "id" (client-cookie-name c)))
	     cookies))
    (if id-cookie
	(client-cookie-value id-cookie)
	(redirect-to "/?msg=baduser"))))
	  
(define get-cat-hours
  (lambda (req)
    '()))

(define get-tasks
  (lambda (req)
    (let ((task-match (mongo-dict-query
		 "task"
		 (make-hasheq
		  (list (cons 'username (current-username req)))))))
    (response/xexpr
     `(tasks
       ,@(for/list ((t task-match))
		   (let* ((enddate (seconds->date (round (/ (string->number (mongo-dict-ref t 'endtime)) 1000))))
			  (year (date-year enddate))
			  (day (date-day enddate))
			  (month (date-month enddate)))
		   `(task
		     (hours ,(real->decimal-string (/ (/ (/ (- (string->number (mongo-dict-ref t 'endtime))
					       (string->number (mongo-dict-ref t 'starttime))) 1000) 60) 60)))
		     (endtime ,(mongo-dict-ref t 'endtime))
		     (enddate ,(string-append "new Date(" (mongo-dict-ref t 'endtime) ")"))
		     (starttime ,(mongo-dict-ref t 'starttime))
		     (comment ,(mongo-dict-ref t 'comment))
		     (category ,(mongo-dict-ref t 'category))
		     (bugnumber ,(mongo-dict-ref t 'bugnumber))))))
     #:mime-type #"application/xml"))))

(define validate-user
  (lambda (req)
    (cond
      ((current-user? (car (formlet-process user-formlet req))
                      (second
                       (formlet-process user-formlet req)))
       (define id-cookie 
         (make-cookie "id" 
                      (car (formlet-process user-formlet req)) #:secure? #t))
       (redirect-to "timer" #:headers (list (cookie->header id-cookie))))
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
    (response/xexpr
     `(html
       (head (title "Task Timer")
             (script ((type "text/javascript")(src "jquery-1.6.4.js")) " ")
	     	      (link ((href "http://fonts.googleapis.com/css?family=Geostar+Fill") (rel "stylesheet") (type "text/css"))" ")
             (script ((type "text/javascript")(src "eggtimer.js"))" "))
       (body ((bgcolor "#e5e5e5"))
             (div ((id "center_content")
		   (style "margin-left:auto;margin-right:auto;width:700px;"))
		   (div ((style "align-text:center;margin-left:auto;margin-right:auto;width:700px;font-family: 'Geostar Fill',cursive;"))
			 (h1 "Task Timer"))
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
                             (input ((type "submit")(name "login")(value "Create Account")))
                             ))))))))
    
(define save-task
  (lambda (req)
    (define cookies (request-cookies req))
    (define id-cookie
      (findf (lambda (c)
	       (string=? "id" (client-cookie-name c)))
    cookies))
    (define bindings (request-bindings req))
    (let*
	((bugnumber (extract-binding/single 'bugnumber bindings))
	 (comment (extract-binding/single 'comment bindings))
	 (endtime (extract-binding/single 'endtime bindings))
	 (category (extract-binding/single 'category bindings))
	 (username (client-cookie-value id-cookie))
	 (starttime (extract-binding/single 'starttime bindings)))
      	  
      (make-task #:username username
		 #:bugnumber bugnumber
		 #:comment comment
		 #:category category
		 #:endtime endtime
		 #:starttime starttime))
    (response/xexpr
     '(msg "Task saved."))))

(define (start request)
  (eggtimer-dispatch request))

(define-values (eggtimer-dispatch tracker-url)
  (dispatch-rules
   (("") logon-page)
   (("save-task") save-task)
   (("get-tasks") get-tasks)
   (("validate-new-user") validate-new-user)
   (("validate-user") validate-user)
   (("timer") timer-page)))

(serve/servlet start
               #:launch-browser? #f
               #:quit? #f
	       #:ssl? #t
               #:listen-ip #f
               #:port 8081
               #:ssl-cert (build-path "/home/shad/mysrc/eggtimer" "server-cert.pem")
               #:ssl-key (build-path "/home/shad/mysrc/eggtimer" "private-key.pem")
               #:servlet-regexp #rx""
               #:extra-files-paths (list 
				    (build-path "/home/shad/mysrc/eggtimer/htdocs"))
               #:servlet-path "/main.rkt")
