function cmp_passwords () {
    if ($('#new_password').val() == $('#new_password2').val()){
	return true;
    } else {
	$('#message_div').html("The passwords do not match.");
	return false;
    }
}
function logout() {
    YUI().use('cookie', function(Y) {
	Y.Cookie.remove("id");
	window.location = "/";
    });
}

function check_login () {
    if ($('#password').val() == '') {
	$('#message_div').html("Password is required.");
	return false;
    }
    return true;
}

function update_bugnum (count) {
    $.ajax({
    url: "update-bugnum",
    context: document.body,
    data: "starttime=" + $("#starttime_" + count).val() +
        "&bugnumber=" + $("#bug_num_" + count).val()
    });
}

function update_cat (count) {
    $.ajax({
    url: "update-category",
    context: document.body,
    data: "starttime=" + $("#starttime_" + count).val() +
        "&category=" + $("#auto_cat" + count).val()
    });
}

function update_notes (count) {
    $.ajax({
    url: "update-comment",
    context: document.body,
    data: "starttime=" + $("#starttime_" + count).val() +
        "&comment=" + $("#comment_" + count).val()
    });
}

function add_task() {
    var d = new Date();
    var task_count = $('#tasks-table tr').length - 1;
    var task_row = $("<tr id='task_" + 
		     task_count + 
		     "'><td><input type='hidden' value='" + 
		     d.getTime() +
		     "' id='starttime_"+
		     task_count +
		     "'><input type='text' onchange='update_bugnum(" + 
		     task_count + 
		     ")' id='bug_num_"+ 
		     task_count + 
		     "'></td><td><input type='text' onchange='update_cat(" + 
		     task_count + 
		     ")' id='auto_cat" + 
		     task_count + 
		     "'></td><td><input type='text' onchange='update_notes("+ 
		     task_count + 
		     ")' id='comment_" + 
		     task_count + 
		     "'></td><td colspan='2'><button onclick='cancel_task(" + 
		     task_count + 
		     ")'>CANCEL</button><button onclick='end_task(" +
		     task_count + 
		     ")'>END</button></td></tr>");


    $("#tasks-table tr:last").after(task_row);

    YUI().use('event', 'autocomplete', 'autocomplete-highlighters', function(Y) {
	Y.Event.onAvailable('#auto_cat' + task_count, function(e) {
	    Y.one('#auto_cat'+task_count).plug(Y.Plugin.AutoComplete, {
		resultHighlighter: 'phraseMatch',
		source: ['QA (R&D)','QA (Support)','R&D','R&D Planning','R&D Documentation','IT']
	    });
	});
    });
    $.ajax({
	url: "create-task",
	context: document.body,
	data: "starttime=" + $("#starttime_" + task_count).val() + 
	    "&in-progress=1",
	success: function() {}
    });
}

function end_task(count) {
    var d = new Date();
    if($("#bug_num_"+count).val() == "" &&
       $("#comment_"+count).val() == "") {
	alert("Either bug number or comment is required.");
	return false;
    }

    $.ajax({
	url: "save-task",
	context: document.body,
	data: "bugnumber=" + $("#bug_num_" + count).val() +
	    "&comment=" + $("#comment_" + count).val() +
	    "&category=" + encodeURIComponent($("#auto_cat" + count).val()) +
	    "&starttime=" + $("#starttime_" + count).val() +
	    "&endtime=" + d.getTime(),
	success: function() {
	    alert("task saved");
	    $('#task_' + count).remove();
	}
    });
}

function cancel_task(count) {
    $.ajax({
	url: "remove-doc",
	content: document.body,
	data: "starttime=" +
            $("#starttime_" +count).val()});
    $('#task_' + count).remove();
}

function init() {
    YUI().use("datasource", 
	      "datasource-get", 
	      "datasource-io", 
	      "datasource-xmlschema", 
	      "datatable-sort", 
	      "datatable-scroll", 
	      "datatype-date",
	      "autocomplete",
	      "charts",
	      "event",
	      "event-base",
	      "tabview",
	      "cookie",
	      "datatable-datasource", 
	      function(Y){
		  var id_value = Y.Cookie.get("id");
		  if (id_value == null) {
		      window.location = "/";
		  }
		  var tabview = new Y.TabView({srcNode:'#timertab'});
		  tabview.render();
		  var formatDates = function (o){
		      var dateObj = eval(o.value);
		      return (dateObj.getMonth()+1) + "/" + dateObj.getDate() + "/" + dateObj.getFullYear();
		  };
		  var noNullValue = function(o) {
		      if (!o.value) return '';
		      else return o.value;
		  } 
		  var cols = [
		      {key: "Bug Number", formatter:noNullValue, sortable: true},
		      {key: "Category", formatter:noNullValue, sortable: true},
		      {key: "Comment", formatter:noNullValue, sortable: true},
		      {key: "Hours", sortable: true},
		      {key: "End", formatter: formatDates, sortable: true}
		  ];
		  var dataSource = new Y.DataSource.IO({
		      source:"/get-tasks?"
		  });

		  dataSource.plug(Y.Plugin.DataSourceXMLSchema, {
		      schema: {
			  resultListLocator: "task",
			  resultFields:[
			      {key:"Bug Number", locator:"*[local-name()='bugnumber']"},
			      {key:"Category", locator:"*[local-name()='category']"},
			      {key:"Comment", locator:"*[local-name()='comment']"},
			      {key:"Hours", locator:"*[local-name()='hours']"},
			      {key:"End", locator:"*[local-name()='enddate']"}
			  ]
		      }
		  });

		  var myCallback = {
		      success: function(e){
			  alert(e.response);
		      },
		      failure: function(e){
			  alert("Could not retrieve data: " + e.error.message);
		      }
		  };

		  var table = new Y.DataTable.Base({
		      columnset: cols,
		      summary: "Tasks",
		      caption: ""
		  }).plug(Y.Plugin.DataTableSort).render("#all-tasks");

		  table.plug(Y.Plugin.DataTableDataSource, {
		      datasource: dataSource,
		      initialRequest: ""
		  });
		  table.plug(Y.Plugin.DataTableScroll, {
		      width: "500px",
		      height: "600px"
		  });

		  var tab;
		  Y.on('domready', function(e) {
		      tab = new Y.Tab({
			  label: "Chart",
			  content: '<iframe scrolling="no" src="chart.html" height="430" width="430" id="chart-frame"></iframe>'
		      });
		      tabview.add(tab);
		      tabview.render();
		  });
		  tabview.on('selectionChange', function(e) {
              if (e.newVal.get('label') == 'Chart')
    		      document.getElementById('chart-frame').src = 'chart.html';
              if (e.newVal.get('label') == 'Data') {
		        table.datasource.load({
			        request:""
		        });
		        table.render("#all-tasks");
              }
		  });
   });
}
