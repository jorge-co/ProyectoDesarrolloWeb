import os
import sqlite3
from sqlite3.dbapi2 import connect
from flask import Flask, render_template, send_from_directory, redirect, url_for, request, session, g

# Aplicacion de Flask
app = Flask(__name__)
app.secret_key = 'abe4a02aa23e11aeaa52f8f3576e12f605c9725ced3a4f84'

# Base de datos SQLite
def obtener_conexion():
	conexion = getattr(g, 'base_de_datos', None)

	if conexion is None:
		ruta = os.path.join(app.root_path, 'usuarios.db')
		conexion = sqlite3.connect(ruta)
		g.base_de_datos = conexion

	return conexion

@app.teardown_appcontext
def cerrar_conexion(_):
    conexion = getattr(g, 'base_de_datos', None)

    if conexion is not None:
        conexion.close()

def comillar(texto):
	return '\'' + texto + '\''

class Usuario:
	def __init__(self, datos):
		self.correo = datos[0]
		self.clave = datos[1]

def cargar_usuario(correo):
	conexion = obtener_conexion()
	cursor = conexion.cursor()
	correo = correo.lower()

	cursor.execute('SELECT * FROM Usuarios WHERE LOWER(correo) = ' + comillar(correo))
	resultado = cursor.fetchall()

	if resultado:
		return Usuario(resultado[0])

	return False

def borrar_usuario(correo):
	conexion = obtener_conexion()
	cursor = conexion.cursor()

	cursor.execute('DELETE FROM Usuarios WHERE correo = ' + comillar(correo))
	conexion.commit()

def registrar_usuario(correo, clave):
	conexion = obtener_conexion()
	cursor = conexion.cursor()

	usuario = cargar_usuario(correo)

	if not usuario:
		usuario = '(' + comillar(correo) + ', ' + comillar(clave) + ')'
		cursor.execute('INSERT INTO Usuarios VALUES ' + usuario)
		conexion.commit()
		return True

	return False

def editar_usuario(correo_actual, correo, clave):
	usuario = cargar_usuario(correo)

	if not usuario or correo == correo_actual:
		session['correo'] = correo
		borrar_usuario(correo_actual)
		registrar_usuario(correo, clave)
		return True

	return False

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/admision')
def admision():
	return render_template('admision.html')

@app.route('/temario')
def temario():
	return render_template('temario.html')

@app.route('/ejemplo')
def ejemplo():
	return render_template('ejemplo.html')

@app.route('/acceder')
def acceder():
	if not session.get('conectado'):
		return render_template('acceder.html')
	return redirect(url_for('cuenta'))

@app.route('/cuenta')
def cuenta():
	if session.get('conectado'):
		correo = session['correo']
		return render_template('cuenta.html', correo = correo)
	return redirect(url_for('acceder'))

@app.route('/acceder_post', methods=['POST'])
def acceder_post():
	correo = request.form['correo']
	clave = request.form['clave']
	mensaje = ''

	if request.form['boton'] == 'registro':
		registro = registrar_usuario(correo, clave)

		if registro:
			session['correo'] = correo
			session['conectado'] = True
			return redirect('../cuenta')

		mensaje = 'El usuario ya existe'

	elif request.form['boton'] == 'acceso':
		usuario = cargar_usuario(correo)

		if usuario:
			if clave == usuario.clave:
				session['correo'] = usuario.correo
				session['conectado'] = True
				return redirect('../cuenta')
			else:
				mensaje = 'Clave incorrecta'
		else:
			mensaje = 'El usuario no existe'
		
	usuario = Usuario([correo, clave])
	return render_template('acceder.html', mensaje = mensaje, usuario = usuario)

@app.route('/cuenta_post', methods=['POST'])
def cuenta_post():
	correo = session['correo']

	if request.form['boton'] == 'editar':
		usuario = cargar_usuario(correo)
		return render_template('editar.html', usuario = usuario)

	elif request.form['boton'] == 'salir':
		session['conectado'] = False

	elif request.form['boton'] == 'borrar':
		session['conectado'] = False
		borrar_usuario(correo)

	return redirect(url_for('acceder'))

@app.route('/editar_post', methods=['POST'])
def editar_post():
	if request.form['boton'] == 'cancelar':
		return redirect(url_for('cuenta'))

	elif request.form['boton'] == 'guardar':
		correo_actual = session['correo']
		correo = request.form['correo']
		clave = request.form['clave']

		if editar_usuario(correo_actual, correo, clave):
			return redirect(url_for('cuenta'))
		
		mensaje = "El correo deseado ya no esta disponible"
		usuario = Usuario([correo, clave])
		return render_template('editar.html', mensaje = mensaje, usuario = usuario)

@app.route('/favicon.ico')
def favicon():
	ruta_base = os.path.join(app.root_path, 'static/img')
	return send_from_directory(ruta_base, 'favicon.ico')

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
	
