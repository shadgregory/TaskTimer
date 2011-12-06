function cmp_passwords () {
    if ($('#new_password').val() == $('#new_password2').val()){
	return true;
    } else {
	$('#message_div').html("The passwords do not match.");
	return false;
    }
}

function check_login () {
    if ($('#password').val() == '') {
	$('#message_div').html("Password is required.");
	return false;
    }
    return true;
}

function add_task() {
    var d = new Date();
//    $("#no-tasks").hide();
    var task_count = $('#tasks-table tr').length - 1;
    var task_row = $("<tr id='task_" + 
		     task_count + 
		     "'><td><input type='hidden' value='" + 
		     d.getTime() +
		     "' id='starttime_"+
		     task_count +
		     "'><input type='text' id='bug_num_"+ 
		     task_count + 
		     "'></td><td><input type='text' id='auto_cat" + 
		     task_count + 
		     "'></td><td><input type='text' id='comment_" + 
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

}

function end_task(count) {
    var d = new Date();
    if($("#bug_num_"+count).val() == "" &&
       $("#comment_"+count).val() == "") {
	alert("Either bug number or comment is required.");
	return false;
    }
    alert($("#auto_cat" + count).val());

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
    $('#task_' + count).remove();
}

function init(Y) {
    var tabview = new Y.TabView({srcNode:'#timertab'});
    tabview.render();
    YUI().use("datasource", 
	      "datasource-get", 
	      "datasource-io", 
	      "datasource-xmlschema", 
	      "datatable-sort", 
	      "datatable-scroll", 
	      "datatype-date",
	      "autocomplete",
	      "datatable-datasource", 
	      function(Y){
		  var formatDates = function (o){
		      var dateObj = eval(o.value);
		      return (dateObj.getMonth()+1) + "/" + dateObj.getDate() + "/" + dateObj.getFullYear();
		  };
		  var cols = [
		      {key: "Bug Number", sortable: true},
		      {key: "Category", sortable: true},
		      {key: "Comment", sortable: true},
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
		  dataSource.after("response", function(){
		      table.render("all-tasks");
		  });
	      });
}
