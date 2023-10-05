from frappe import _


def get_data():
	return {
		'fieldname': 'purchase_order',
		'non_standard_fieldnames': {
			'Journal Entry': 'reference_name',
			'Payment Entry': 'reference_name',
			'Auto Repeat': 'reference_document'
		},
		'internal_links': {
			'Material Request': ['items', 'material_request'],
			'Supplier Quotation': ['items', 'supplier_quotation'],
			'Project': ['items', 'project'],
			'Sales Order': ['items', 'sales_order'],
			'Work Order': ['items', 'work_order'],
		},
		'transactions': [
			{
				'label': _('Fulfilment'),
				'items': ['Purchase Receipt', 'Purchase Invoice']
			},
			{
				'label': _('Previous Document'),
				'items': ['Material Request', 'Supplier Quotation', 'Sales Order']
			},
			{
				'label': _('Reference'),
				'items': ['Stock Entry', 'Work Order', 'Project']
			},
			{
				'label': _('Payment'),
				'items': ['Payment Entry', 'Journal Entry']
			},
		]
	}
