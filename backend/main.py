
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, ForeignKey
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session as SASession, relationship

DATABASE_URL = "sqlite:///./maobe_pedidos.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class StoreORM(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    whatsapp_number = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, nullable=True)

    products = relationship("ProductORM", back_populates="store", cascade="all, delete-orphan")
    delivery_zones = relationship("DeliveryZoneORM", back_populates="store", cascade="all, delete-orphan")
    coupons = relationship("CouponORM", back_populates="store", cascade="all, delete-orphan")


class ProductORM(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)

    store = relationship("StoreORM", back_populates="products")


class DeliveryZoneORM(Base):
    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    min_total_free = Column(Float, nullable=True)

    store = relationship("StoreORM", back_populates="delivery_zones")


class CouponORM(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    code = Column(String, nullable=False)
    percent = Column(Float, nullable=False)
    min_total = Column(Float, nullable=True)
    active = Column(Boolean, default=True)

    store = relationship("StoreORM", back_populates="coupons")


class OrderORM(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    customer_name = Column(String, nullable=True)
    customer_address = Column(String, nullable=True)
    customer_note = Column(String, nullable=True)
    delivery_type = Column(String, default="retiro")  # retiro / envio
    payment_method = Column(String, nullable=True)
    status = Column(String, default="pendiente")
    subtotal = Column(Float, nullable=False, default=0.0)
    delivery_zone_name = Column(String, nullable=True)
    delivery_price = Column(Float, nullable=False, default=0.0)
    coupon_code = Column(String, nullable=True)
    discount_value = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)

    store = relationship("StoreORM")
    items = relationship("OrderItemORM", back_populates="order", cascade="all, delete-orphan")


class OrderItemORM(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("OrderORM", back_populates="items")


class StoreBase(BaseModel):
    name: str
    slug: str
    whatsapp_number: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class StoreRead(StoreBase):
    id: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    stock: int = 0
    min_stock: int = 0


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    id: int
    store_id: int

    class Config:
        from_attributes = True


class DeliveryZoneBase(BaseModel):
    name: str
    price: float
    min_total_free: Optional[float] = None


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneRead(DeliveryZoneBase):
    id: int
    store_id: int

    class Config:
        from_attributes = True


class CouponBase(BaseModel):
    code: str
    percent: float
    min_total: Optional[float] = None
    active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponRead(CouponBase):
    id: int
    store_id: int

    class Config:
        from_attributes = True


class OrderItemInput(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    store_slug: str
    items: List[OrderItemInput]
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_note: Optional[str] = None
    delivery_type: Optional[str] = "retiro"
    payment_method: Optional[str] = None
    delivery_zone_id: Optional[int] = None
    coupon_code: Optional[str] = None


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    store_id: int
    created_at: str
    customer_name: Optional[str]
    customer_address: Optional[str]
    customer_note: Optional[str]
    delivery_type: Optional[str]
    payment_method: Optional[str]
    status: str
    subtotal: float
    delivery_zone_name: Optional[str]
    delivery_price: float
    coupon_code: Optional[str]
    discount_value: float
    total: float
    items: List[OrderItemRead]

    class Config:
        from_attributes = True


class CatalogResponse(BaseModel):
    store: StoreRead
    products: List[ProductRead]
    delivery_zones: List[DeliveryZoneRead]
    coupons: List[CouponRead]


class StatsSummary(BaseModel):
    today_orders: int
    today_total: float
    last7_orders: int
    last7_total: float


app = FastAPI(title="MaOBe Pedidos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.post("/stores", response_model=StoreRead)
def create_store(store: StoreCreate, db: SASession = Depends(get_db)):
    exists = db.query(StoreORM).filter(StoreORM.slug == store.slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Slug ya está en uso")
    db_store = StoreORM(**store.dict())
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store


@app.get("/stores", response_model=List[StoreRead])
def list_stores(db: SASession = Depends(get_db)):
    stores = db.query(StoreORM).all()
    return stores


@app.get("/stores/{store_id}", response_model=StoreRead)
def get_store(store_id: int, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return store


@app.patch("/stores/{store_id}", response_model=StoreRead)
def update_store(store_id: int, update: StoreUpdate, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(store, field, value)
    db.commit()
    db.refresh(store)
    return store


@app.post("/stores/{store_id}/products", response_model=ProductRead)
def create_product(store_id: int, product: ProductCreate, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    db_product = ProductORM(store_id=store_id, **product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/stores/{store_id}/products", response_model=List[ProductRead])
def list_products_admin(store_id: int, db: SASession = Depends(get_db)):
    products = db.query(ProductORM).filter(ProductORM.store_id == store_id).all()
    return products


@app.post("/stores/{store_id}/delivery-zones", response_model=DeliveryZoneRead)
def create_delivery_zone(store_id: int, zone: DeliveryZoneCreate, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    db_zone = DeliveryZoneORM(store_id=store_id, **zone.dict())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone


@app.get("/stores/{store_id}/delivery-zones", response_model=List[DeliveryZoneRead])
def list_delivery_zones(store_id: int, db: SASession = Depends(get_db)):
    zones = db.query(DeliveryZoneORM).filter(DeliveryZoneORM.store_id == store_id).all()
    return zones


@app.post("/stores/{store_id}/coupons", response_model=CouponRead)
def create_coupon(store_id: int, coupon: CouponCreate, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    db_coupon = CouponORM(store_id=store_id, **coupon.dict())
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon


@app.get("/stores/{store_id}/coupons", response_model=List[CouponRead])
def list_coupons(store_id: int, db: SASession = Depends(get_db)):
    coupons = db.query(CouponORM).filter(CouponORM.store_id == store_id).all()
    return coupons


@app.post("/orders", response_model=OrderRead)
def create_order(order: OrderCreate, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.slug == order.store_slug).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    product_ids = [item.product_id for item in order.items]
    products = db.query(ProductORM).filter(ProductORM.id.in_(product_ids)).all()
    products_map = {p.id: p for p in products}
    if len(products) != len(product_ids):
        raise HTTPException(status_code=400, detail="Uno o más productos no existen")

    subtotal = 0.0
    for item in order.items:
        prod = products_map[item.product_id]
        if prod.stock is not None and prod.stock > 0:
            if prod.stock - item.quantity < 0:
                raise HTTPException(status_code=400, detail=f"Sin stock suficiente para {prod.name}")
        subtotal += prod.price * item.quantity

    delivery_price = 0.0
    delivery_zone_name = None
    if order.delivery_zone_id is not None:
        zone = db.query(DeliveryZoneORM).filter(
            DeliveryZoneORM.id == order.delivery_zone_id,
            DeliveryZoneORM.store_id == store.id
        ).first()
        if not zone:
            raise HTTPException(status_code=400, detail="Zona de entrega inválida")
        delivery_zone_name = zone.name
        if zone.min_total_free is not None and subtotal >= zone.min_total_free:
            delivery_price = 0.0
        else:
            delivery_price = zone.price

    discount_value = 0.0
    coupon_code = None
    if order.coupon_code:
        coupon = db.query(CouponORM).filter(
            CouponORM.store_id == store.id,
            CouponORM.code == order.coupon_code,
            CouponORM.active == True
        ).first()
        if coupon:
            if coupon.min_total is None or subtotal >= coupon.min_total:
                discount_value = subtotal * (coupon.percent / 100.0)
                coupon_code = coupon.code

    total = subtotal + delivery_price - discount_value

    db_order = OrderORM(
        store_id=store.id,
        customer_name=order.customer_name,
        customer_address=order.customer_address,
        customer_note=order.customer_note,
        delivery_type=order.delivery_type or "retiro",
        payment_method=order.payment_method,
        status="pendiente",
        subtotal=subtotal,
        delivery_zone_name=delivery_zone_name,
        delivery_price=delivery_price,
        coupon_code=coupon_code,
        discount_value=discount_value,
        total=total,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    for item in order.items:
        prod = products_map[item.product_id]
        db_item = OrderItemORM(
            order_id=db_order.id,
            product_id=prod.id,
            product_name=prod.name,
            quantity=item.quantity,
            unit_price=prod.price,
        )
        db.add(db_item)
        if prod.stock is not None and prod.stock > 0:
            prod.stock = max(0, prod.stock - item.quantity)

    db.commit()
    db.refresh(db_order)
    return db_order


@app.get("/stores/{store_id}/orders", response_model=List[OrderRead])
def list_orders(store_id: int, db: SASession = Depends(get_db)):
    orders = (
        db.query(OrderORM)
        .filter(OrderORM.store_id == store_id)
        .order_by(OrderORM.id.desc())
        .all()
    )
    return orders


class OrderStatusUpdate(BaseModel):
    status: str


@app.patch("/orders/{order_id}/status", response_model=OrderRead)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: SASession = Depends(get_db)):
    order = db.query(OrderORM).filter(OrderORM.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


@app.get("/stores/{store_id}/stats/summary", response_model=StatsSummary)
def stats_summary(store_id: int, db: SASession = Depends(get_db)):
    today_str = date.today().isoformat()
    seven_days_ago = date.fromordinal(date.today().toordinal() - 6).isoformat()

    orders = db.query(OrderORM).filter(OrderORM.store_id == store_id).all()
    today_orders = 0
    today_total = 0.0
    last7_orders = 0
    last7_total = 0.0

    for o in orders:
        if not o.created_at:
            continue
        d_str = o.created_at[:10]
        if d_str == today_str:
            today_orders += 1
            today_total += o.total
        if seven_days_ago <= d_str <= today_str:
            last7_orders += 1
            last7_total += o.total

    return StatsSummary(
        today_orders=today_orders,
        today_total=today_total,
        last7_orders=last7_orders,
        last7_total=last7_total,
    )


@app.get("/catalog/{slug}", response_model=CatalogResponse)
def public_catalog(slug: str, db: SASession = Depends(get_db)):
    store = db.query(StoreORM).filter(StoreORM.slug == slug).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    products = db.query(ProductORM).filter(
        ProductORM.store_id == store.id,
        ProductORM.is_active == True
    ).all()
    zones = db.query(DeliveryZoneORM).filter(DeliveryZoneORM.store_id == store.id).all()
    coupons = db.query(CouponORM).filter(
        CouponORM.store_id == store.id,
        CouponORM.active == True
    ).all()
    return CatalogResponse(
        store=store,
        products=products,
        delivery_zones=zones,
        coupons=coupons,
    )
