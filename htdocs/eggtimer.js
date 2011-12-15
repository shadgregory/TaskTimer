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

function update_bugnum (st) {
    $.ajax({
    url: "update-bugnum",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&bugnumber=" + $("#bug_num_" + st).val()
    });
}

function update_cat (st) {
    $.ajax({
    url: "update-category",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&category=" + encodeURIComponent($("#auto_cat" + st).val())
    });
}

function update_notes (st) {
    $.ajax({
    url: "update-comment",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&comment=" + $("#comment_" + st).val()
    });
}

function pause(st) {
    $.ajax({
	url: "pause",
	data: "starttime=" + st,
	context:document.body,
	success: function() {
	    $("#pause_" + st).hide();
	    $("#unpause_" + st).show();
	}
    });
}

function unpause(st) {
    $.ajax({
	url: "unpause",
	data: "starttime=" + st,
	context:document.body,
	success: function() {
	    $("#pause_" + st).show();
	    $("#unpause_" + st).hide();
	}
    });
}

function add_task() {
    var d = new Date();
    var task_row = $("<tr id='task_" + 
		     d.getTime() + 
		     "'><td><input type='hidden' value='" + 
		     d.getTime() +
		     "' id='starttime_"+
		     d.getTime() +
		     "'><input type='text' onchange='update_bugnum(" + 
		     d.getTime() + 
		     ")' id='bug_num_"+ 
		     d.getTime() + 
		     "'></td><td><input type='text' onchange='update_cat(" + 
		     d.getTime() + 
		     ")' id='auto_cat" + 
		     d.getTime() + 
		     "'></td><td><input type='text' onchange='update_notes("+ 
		     d.getTime() + 
		     ")' id='comment_" + 
		     d.getTime() + 
		     "'></td><td colspan='3'><button onclick='cancel_task(" + 
		     d.getTime() + 
		     ")'>CANCEL</button><button id='end_"+
		     d.getTime() +
		     "' onclick='end_task(" +
		     d.getTime() + 
		     ")'>END</button><button style='display:inline;' id='pause_" + 
		     d.getTime() + 
		     "' onclick='pause(" +
		     d.getTime() +
		     ")'>PAUSE</button><button style='display:none;' id='unpause_" + 
		     d.getTime() +
		     "' onclick='unpause(" +
		     d.getTime() +
		     ")'>UNPAUSE</button></td></tr>");

    $("#tasks-table tr:last").after(task_row);

    YUI().use('event', 'autocomplete', 'autocomplete-highlighters', function(Y) {
	Y.Event.onAvailable('#auto_cat' + d.getTime(), function(e) {
	    Y.one('#auto_cat'+d.getTime()).plug(Y.Plugin.AutoComplete, {
		resultHighlighter: 'phraseMatch',
		source: ['QA (R&D)','QA (Support)','R&D','R&D Planning','R&D Documentation','Lunch','IT','TEST']
	    });
	});
    });
    $.ajax({
	url: "create-task",
	context: document.body,
	data: "starttime=" + $("#starttime_" + d.getTime()).val() + 
	    "&in-progress=1",
	success: function() {}
    });
}

function end_task(st) {
    var d = new Date();
    if($("#bug_num_"+st).val() == "" &&
       $("#comment_"+st).val() == "") {
	alert("Either bug number or comment is required.");
	return false;
    }

    $.ajax({
	url: "save-task",
	context: document.body,
	data: "bugnumber=" + $("#bug_num_" + st).val() +
	    "&comment=" + $("#comment_" + st).val() +
	    "&category=" + encodeURIComponent($("#auto_cat" + st).val()) +
	    "&starttime=" + $("#starttime_" + st).val() +
	    "&endtime=" + d.getTime(),
	success: function() {
	    alert("task saved");
	    $('#task_' + st).remove();
	}
    });
}

function cancel_task(st) {
    $.ajax({
	url: "remove-doc",
	content: document.body,
	data: "starttime=" +
            $("#starttime_" +st).val()});
    $('#task_' + st).remove();
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
	      "calendar",
	      "event",
	      "event-base",
	      "tabview",
	      "cookie",
	      "gallery-paginator",
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
		  // Paginator
		  function updatePaginator(
		      /* object */	state) {
		      this.setPage(state.page, true);
		      this.setRowsPerPage(state.rowsPerPage, true);
		      sendRequest();
		  }

		  var pg = new Y.Paginator({
		      rowsPerPage: 20,
		      template: '{FirstPageLink} {PreviousPageLink} {PageLinks} {NextPageLink} {LastPageLink}',
		      firstPageLinkLabel:    '|&lt;',
		      previousPageLinkLabel: '&lt;',
		      nextPageLinkLabel:     '&gt;',
		      lastPageLinkLabel:     '&gt;|'
		  });
		  pg.on('changeRequest', updatePaginator);
		  pg.render('#pg');

		  dataSource.on('response', function(e)	{
		      pg.setTotalRecords(e.response.meta.totalRecords, true);
		      pg.render();
		  });
		  //End Paginator

		  var tab;
		  Y.on('domready', function(e) {
		      tab = new Y.Tab({
			  label: "Chart",
			  content: '<center><iframe scrolling="no" src="chart.html" height="430" width="430" id="chart-frame"></iframe></center>'
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
