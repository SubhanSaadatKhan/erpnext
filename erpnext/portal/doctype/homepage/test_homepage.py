# -*- coding: utf-8 -*-
# Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
import unittest
from frappe.tests.test_website import set_request
from frappe.website.render import render

class TestHomepage(unittest.TestCase):
	def test_homepage_load(self):
		set_request(method='GET', path='home')
		response = render()

		self.assertEquals(response.status_code, 200)

		html = frappe.safe_decode(response.get_data())
		self.assertTrue('<section class="hero-section' in html)
