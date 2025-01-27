// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

cur_frm.add_fetch('employee','employee_name','employee_name');
cur_frm.add_fetch('employee','company','company');

frappe.ui.form.on("Leave Application", {
	setup: function(frm) {
		frm.set_query("leave_approver", function() {
			return {
				query: "erpnext.hr.doctype.department_approver.department_approver.get_approvers",
				filters: {
					employee: frm.doc.employee,
					doctype: frm.doc.doctype
				}
			};
		});

		frm.set_query("employee", erpnext.queries.employee);
	},
	onload: function(frm) {
		if (!frm.doc.posting_date) {
			frm.set_value("posting_date", frappe.datetime.get_today());
		}
		if (frm.doc.docstatus == 0) {
			return frappe.call({
				method: "erpnext.hr.doctype.leave_application.leave_application.get_mandatory_approval",
				args: {
					doctype: frm.doc.doctype,
				},
				callback: function(r) {
					if (!r.exc && r.message) {
						frm.toggle_reqd("leave_approver", true);
					}
				}
			});
		}
	},

	validate: function(frm) {
		frm.toggle_reqd("half_day_date", frm.doc.half_day == 1);
		if (frm.doc.half_day == 0){
			frm.doc.half_day_date = "";
		}
	},

	make_dashboard: function(frm) {
		var leave_details;
		if (frm.doc.employee) {
			frappe.call({
				method: "erpnext.hr.doctype.leave_application.leave_application.get_leave_details",
				async: false,
				args: {
					employee: frm.doc.employee,
					date: frm.doc.from_date || frm.doc.posting_date
				},
				callback: function(r) {
					if (!r.exc && r.message['leave_allocation']) {
						leave_details = r.message['leave_allocation'];
					}
					if (!r.exc && r.message['leave_approver']) {
						frm.set_value('leave_approver', r.message['leave_approver']);
					}
				}
			});
			$(".leave-application-dashboard", frm.$wrapper).parent().remove();
			frm.dashboard.add_section(
				frappe.render_template('leave_application_dashboard', {
					data: leave_details
				})
			);
			frm.dashboard.show();
		}
	},

	refresh: function(frm) {
		erpnext.hide_company();
		if (frm.is_new()) {
			frm.trigger("calculate_total_days");
		}
		cur_frm.set_intro("");
		if(frm.doc.__islocal && !in_list(frappe.user_roles, "Employee")) {
			frm.set_intro(__("Fill the form and save it"));
		}

		if (!frm.doc.employee && frappe.defaults.get_user_permissions()) {
			const perm = frappe.defaults.get_user_permissions();
			if (perm && perm['Employee']) {
				frm.set_value('employee', perm['Employee'].map(perm_doc => perm_doc.doc)[0]);
			}
		}
		frm.trigger("toggle_leave_days_read_only");
		frm.trigger("make_dashboard");
	},

	employee: function(frm) {
		frm.trigger("make_dashboard");
		frm.trigger("get_leave_balance");
		frm.trigger("get_number_of_late_days");
		frm.trigger("calculate_total_days");
		frm.trigger("set_leave_approver");
	},

	leave_approver: function(frm) {
		if(frm.doc.leave_approver){
			frm.set_value("leave_approver_name", frappe.user.full_name(frm.doc.leave_approver));
		}
	},

	leave_type: function(frm) {
		frm.trigger("get_leave_balance");
	},

	half_day: function(frm) {
		if (frm.doc.half_day) {
			if (frm.doc.from_date == frm.doc.to_date) {
				frm.set_value("half_day_date", frm.doc.from_date);
			}
			else {
				frm.trigger("half_day_datepicker");
			}
		} else {
			frm.set_value("half_day_date", "");
		}
		frm.trigger("calculate_total_days");
	},

	late_deduction: function(frm) {
		if (frm.doc.late_deduction) {
			frm.doc.half_day = 0;
			frm.doc.half_day_date = "";
			frm.refresh_field("half_day");
			frm.refresh_field("half_day_date");
		}
		frm.trigger("get_number_of_late_days");
		frm.trigger("calculate_total_days");
		frm.trigger("toggle_leave_days_read_only");
	},

	from_date: function(frm) {
		frm.trigger("make_dashboard");
		frm.trigger("half_day_datepicker");
		frm.trigger("get_number_of_late_days");
		frm.trigger("calculate_total_days");
	},

	to_date: function(frm) {
		frm.trigger("half_day_datepicker");
		frm.trigger("get_number_of_late_days");
		frm.trigger("calculate_total_days");
	},

	half_day_date(frm) {
		frm.trigger("calculate_total_days");
	},

	half_day_datepicker: function(frm) {
		frm.set_value('half_day_date', '');
		var half_day_datepicker = frm.fields_dict.half_day_date.datepicker;
		half_day_datepicker.update({
			minDate: frappe.datetime.str_to_obj(frm.doc.from_date),
			maxDate: frappe.datetime.str_to_obj(frm.doc.to_date)
		})
	},

	get_leave_balance: function(frm) {
		if(frm.doc.docstatus==0 && frm.doc.employee && frm.doc.leave_type && frm.doc.from_date && frm.doc.to_date) {
			return frappe.call({
				method: "erpnext.hr.doctype.leave_application.leave_application.get_leave_balance_on",
				args: {
					employee: frm.doc.employee,
					date: frm.doc.from_date,
					to_date: frm.doc.to_date,
					leave_type: frm.doc.leave_type,
					consider_all_leaves_in_the_allocation_period: true
				},
				callback: function(r) {
					if (!r.exc && r.message) {
						frm.set_value('leave_balance', r.message);
					}
					else {
						frm.set_value('leave_balance', "0");
					}
				}
			});
		}
	},

	calculate_total_days: function(frm) {
		if(frm.doc.from_date && frm.doc.to_date && frm.doc.employee && frm.doc.leave_type) {

			var from_date = Date.parse(frm.doc.from_date);
			var to_date = Date.parse(frm.doc.to_date);

			if(to_date < from_date){
				frappe.msgprint(__("To Date cannot be less than From Date"));
				frm.set_value('to_date', '');
				return;
			}
				// server call is done to include holidays in leave days calculations
			return frappe.call({
				method: 'erpnext.hr.doctype.leave_application.leave_application.get_number_of_leave_days',
				args: {
					"employee": frm.doc.employee,
					"leave_type": frm.doc.leave_type,
					"from_date": frm.doc.from_date,
					"to_date": frm.doc.to_date,
					"half_day": frm.doc.half_day,
					"half_day_date": frm.doc.half_day_date,
					"late_deduction": frm.doc.late_deduction,
				},
				callback: function(r) {
					if (r) {
						frm.set_value('total_leave_days', r.message);
						if (frm.doc.late_deduction) {
							frm.set_value('total_late_deduction', r.message);
						} else {
							frm.set_value('total_late_deduction', 0);
						}
						frm.trigger("get_leave_balance");
					}
				}
			});
		}
	},

	get_number_of_late_days: function(frm) {
		if (frm.doc.late_deduction && frm.doc.from_date && frm.doc.to_date && frm.doc.employee) {
			return frappe.call({
				method: 'erpnext.hr.doctype.leave_application.leave_application.get_number_of_late_days',
				args: {
					"employee": frm.doc.employee,
					"from_date": frm.doc.from_date,
					"to_date": frm.doc.to_date,
				},
				callback: function(r) {
					if (r) {
						frm.set_value('total_late_days', r.message);
					}
				}
			});
		} else {
			frm.set_value("total_late_days", 0);
		}
	},

	toggle_leave_days_read_only: function (frm) {
		frm.set_df_property("total_leave_days", "read_only", cint(!frm.doc.late_deduction));
		frm.set_df_property("total_leave_days", "reqd", cint(frm.doc.late_deduction));
	},

	set_leave_approver: function(frm) {
		if(frm.doc.employee) {
				// server call is done to include holidays in leave days calculations
			return frappe.call({
				method: 'erpnext.hr.doctype.leave_application.leave_application.get_leave_approver',
				args: {
					"employee": frm.doc.employee,
				},
				callback: function(r) {
					if (r && r.message) {
						frm.set_value('leave_approver', r.message);
					}
				}
			});
		}
	}
});
