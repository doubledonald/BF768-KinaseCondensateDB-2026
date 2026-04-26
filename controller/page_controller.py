from flask import Blueprint, render_template, redirect
page_bp = Blueprint('page', __name__, url_prefix='')

@page_bp.route('/')
def root(): return redirect('/login')
@page_bp.route('/login')
def login(): return render_template('login.html')
@page_bp.route('/register')
def register(): return render_template('register.html')
@page_bp.route('/index')
def index(): return render_template('index.html')
@page_bp.route('/admin')
def admin(): return render_template('admin.html')
