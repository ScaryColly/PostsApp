import { Request } from "express";

class BaseController {
  model: any;

  constructor(dataModel: any) {
    this.model = dataModel;
  }

  async get(req: Request) {
    return this.model.find(req.query || {}).sort({ createdAt: -1 });
  }

  async getById(req: Request) {
    return this.model.findById(req.params.id);
  }

  async post(req: Request) {
    return this.model.create(req.body);
  }

  async put(req: Request) {
    return this.model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
  }

  async del(req: Request) {
    return this.model.findByIdAndDelete(req.params.id);
  }
}

export default BaseController;
