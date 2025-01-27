# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import cint
from frappe import _
from frappe.model.document import Document

class ProductsSettings(Document):
	def validate(self):
		if self.home_page_is_products:
			website_settings = frappe.get_doc('Website Settings')
			website_settings.home_page = 'products'
			website_settings.save()

		self.validate_field_filters()
		self.validate_attribute_filters()

	def validate_field_filters(self):
		if not (self.enable_field_filters and self.filter_fields): return

		item_meta = frappe.get_meta('Item')
		valid_fields = [df.fieldname for df in item_meta.fields if df.fieldtype in ['Link', 'Table MultiSelect']]

		for f in self.filter_fields:
			if f.fieldname not in valid_fields:
				frappe.throw(_('Filter Fields Row #{0}: Fieldname <b>{1}</b> must be of type "Link" or "Table MultiSelect"').format(f.idx, f.fieldname))

	def validate_attribute_filters(self):
		if not (self.enable_attribute_filters and self.filter_attributes): return

		# if attribute filters are enabled, hide_variants should be disabled
		self.hide_variants = 0


def home_page_is_products(doc, method):
	'''Called on saving Website Settings'''
	home_page_is_products = cint(frappe.db.get_single_value('Products Settings', 'home_page_is_products'))
	if home_page_is_products:
		doc.home_page = 'products'

