#lang racket

(require web-server/servlet
         web-server/http/cookie
         web-server/http/cookie-parse
         web-server/http
         web-server/formlets
         web-server/http/redirect
         web-server/http/bindings
         racket/list
         file/md5
	 xml
         web-server/servlet-env)
(require (planet "main.rkt" ("jaymccarthy" "mongodb.plt" 1 11)))
(require (planet "main.ss" ("dherman" "json.plt" 3 0)))

(define m (create-mongo))
(define d (make-mongo-db m "eggtimer"))
(current-mongo-db d)
(define-mongo-struct task "task"
  ((username #:required)
   (bugnumber)
   (comment)
   (starttime #:required)
   (endtime #:required)))

(define timer-page
  (lambda (req)
    (response/xexpr
    `(html
      (head
       (link ((type "text/css")(rel "stylesheet")(href "http://yui.yahooapis.com/3.4.1/build/cssfonts/fonts-min.css"))" ")
       (script ((type "text/javascript")(src "eggtimer.js")) " ")
       (script ((src "http://yui.yahooapis.com/3.4.1/build/yui/yui-min.js")(charset "utf-8"))" ")
       (script ((type "text/javascript")(src "jquery-1.6.4.js")) " "))
      (body ((class "yui3-skin-sam yui-skin-sam"))
       (div ((id "timertab")(style "margin-left:20%;margin-right:20%;"))
	    (ul
	     (li
	      (a ((href "#tasks-list")) "Create Tasks"))
	     (li
	      (a ((href "#datatable")) "Data")))
	    (div
	     (div ((id "tasks-table")(style "padding: 5px"))
		  (a ((href "#")(onclick "add_task()")) "Add Task")
		  (table ((id "tasks-table")(border "1"))
			 (tr
			  (th "Bug Number")
			  (th "Notes")
			  (th ""))))
	     (div ((id "datatable")) 
		  (div ((id "all-tasks"))))))
       (script ((type "text/javascript"))
	       "YUI({filter: 'raw'}).use('yui', 'tabview', function(Y){ init(Y)});"))))))

(define get-tasks
  (lambda (req)
    (let ((task-match (mongo-dict-query
		 "task"
		 (make-hasheq
		  (list (cons 'username "shad"))))))
    (response/xexpr
     `(tasks
       ,@(for/list ((t task-match))
		   `(task
		     (hours ,(real->decimal-string (/ (/ (- (string->number (mongo-dict-ref t 'endtime))
					       (string->number (mongo-dict-ref t 'starttime))) 1000) 60)))
		     (endtime ,(mongo-dict-ref t 'endtime))
		     (starttime ,(mongo-dict-ref t 'starttime))
		     (comment ,(mongo-dict-ref t 'comment))
		     (bugnumber ,(mongo-dict-ref t 'bugnumber)))))
     #:mime-type #"application/xml"))))
    
(define save-task
  (lambda (req)
    (define bindings (request-bindings req))
    (define d (make-mongo-db (create-mongo) "eggtimer"))
    (current-mongo-db d)
    (define-mongo-struct task "task"
      ((username #:required)
       (bugnumber)
       (comment)
       (starttime #:required)
       (endtime #:required)))
    (let*
	((bugnumber (extract-binding/single 'bugnumber bindings))
	 (comment (extract-binding/single 'comment bindings))
	 (endtime (extract-binding/single 'endtime bindings))
	 (starttime (extract-binding/single 'starttime bindings)))
	  
      (make-task #:username "shad"
		 #:bugnumber bugnumber
		 #:comment comment
		 #:endtime endtime
		 #:starttime starttime))
    (response/xexpr
     '(msg "Task saved."))))

(define (start request)
  (eggtimer-dispatch request))

(define-values (eggtimer-dispatch tracker-url)
  (dispatch-rules
   (("save-task") save-task)
   (("get-tasks") get-tasks)
   (("") timer-page)))

(serve/servlet start
               #:launch-browser? #f
               #:quit? #f
               #:listen-ip #f
               #:port 8081
               #:servlet-regexp #rx""
               #:extra-files-paths (list (build-path "/home/shad/mysrc/eggtimer/htdocs"))
               #:servlet-path "/main.rkt")
