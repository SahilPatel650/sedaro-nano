# HTTP SERVER

import json

from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from simulator import Simulator
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from store import QRangeStore

import logging


class Base(DeclarativeBase):
    pass


############################## Application Configuration ##############################

app = Flask(__name__)
CORS(app, origins=["http://localhost:3030"])

db = SQLAlchemy(model_class=Base)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
db.init_app(app)


############################## Database Models ##############################


class Simulation(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    data: Mapped[str]


with app.app_context():
    db.create_all()


############################## Log ##############################
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


############################## API Endpoints ##############################


@app.get("/")
def health():
    return "<p>Sedaro Nano API - running!</p>"


@app.get("/simulation")
def get_data():
    # Get most recent simulation from database
    simulation: Simulation = Simulation.query.order_by(Simulation.id.desc()).first()
    return simulation.data if simulation else []


@app.post("/simulation")
def simulate():
    # Get data from request in this form
    # { 
    #   simulationData = {
    #     "Body1": {"x": 0, "y": 0.1, "vx": 0.1, "vy": 0},
    #     "Body2": {"x": 0, "y": 1, "vx": 1, "vy": 0},
    #   },
    #   settingsData = { "timeStep": 0.1, "simulationCycle": 100 }
    # }

    # Define time and timeStep for each agent
    req: dict = request.json
    init = req['simulationData']
    settings = req['settingsData']
    for key in init.keys():
        init[key]["time"] = 0
        init[key]["timeStep"] = settings['timeStep']

    # Create store and simulator
    store = QRangeStore()
    simulator = Simulator(store=store, init=init, iterations=settings['simulationCycle'])

    # Run simulation
    simulator.simulate()

    # Save data to database
    simulation = Simulation(data=json.dumps(store.store))
    db.session.add(simulation)
    db.session.commit()

    return store.store


#star trail
#time series
# sim details - quantify how long it took to get to a certain point (ie time between 2 points)
