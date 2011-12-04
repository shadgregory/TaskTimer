function add_task() {
    var d = new Date();
    //var task_count = $("#tasks-list").children().length;
    var task_count = $('#tasks-table tr').length - 1;
    var task_row = $("<tr id='task_" + 
	task_count + 
	"'><td><input type='hidden' value='" + 
	d.getTime() +
	"' id='starttime_"+
	task_count +
	"'><input type='text' id='bug_num_"+ 
	task_count + 
	"'></td><td><input type='text' id='comment_" + 
	task_count + 
	"'></td><td colspan='2'><button onclick='cancel_task(" + 
	task_count + 
	")'>CANCEL</button><button onclick='end_task(" +
	task_count + 
	")'>END</button></td></tr>");

    $("#tasks-table tr:last").after(task_row);
    task_count = task_count + 1;
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
    YUI().use("datasource", "datasource-get", "datasource-io", "datasource-xmlschema", "datasource-textschema", "datatable-datasource", function(Y){
	var cols = ["Bug Number", "Comment", "Hours"];
	var dataSource = new Y.DataSource.IO({
	    source:"/get-tasks?"
	});
	
	dataSource.plug(Y.Plugin.DataSourceXMLSchema, {
	    schema: {
		resultListLocator: "task",
		resultFields:[
		    {key:"Bug Number", locator:"*[local-name()='bugnumber']"},
		    {key:"Comment", locator:"*[local-name()='comment']"},
		    {key:"Hours", locator:"*[local-name()='hours']"}
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
	}).render("#all-tasks");

	table.plug(Y.Plugin.DataTableDataSource, {
	    datasource: dataSource,
	    initialRequest: ""
	});
	dataSource.after("response", function(){
	    table.render("all-tasks");
	});
    });
}
